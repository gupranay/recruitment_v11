import { NextApiRequest, NextApiResponse } from "next";
import { supabaseApi } from "@/lib/supabase/api";
import { Database } from "@/database.types";

// Base types from database
type ApplicantRound = Database["public"]["Tables"]["applicant_rounds"]["Row"];
type Applicant = Database["public"]["Tables"]["applicants"]["Row"];
type RecruitmentRound = Database["public"]["Tables"]["recruitment_rounds"]["Row"];
type RecruitmentCycle = Database["public"]["Tables"]["recruitment_cycles"]["Row"];
type Comment = Database["public"]["Tables"]["comments"]["Row"];
type Score = Database["public"]["Tables"]["scores"]["Row"];
type Metric = Database["public"]["Tables"]["metrics"]["Row"];
type User = Database["public"]["Tables"]["users"]["Row"];
type OrganizationUser = Database["public"]["Tables"]["organization_users"]["Row"];

// Types for nested query results
interface ApplicantRoundWithRelations extends ApplicantRound {
  recruitment_rounds: RecruitmentRoundWithCycle | null;
}

interface RecruitmentRoundWithCycle extends RecruitmentRound {
  recruitment_cycles: RecruitmentCycle | null;
}

interface RoundWithComments {
  id: string;
  recruitment_round_id: string;
  status: string;
  comments: CommentWithUser[] | null;
  recruitment_rounds: { name: string } | null;
}

interface CommentWithUser extends Comment {
  user: Pick<User, "full_name" | "avatar_url"> | null;
}

interface ScoreWithRelations extends Score {
  metrics: Pick<Metric, "name" | "weight"> | null;
  user: Pick<User, "full_name" | "avatar_url"> | null;
}

// Response types
interface FormattedComment {
  id: string;
  user_id: string;
  comment_text: string;
  created_at: string;
  updated_at: string;
  user_name: string | null;
  avatar_url: string | null;
  round_name: string | null;
  source: string | null;
  is_edited: boolean;
}

interface FormattedScore {
  score_id: string;
  metric_id: string;
  metric_name: string | null;
  score_value: number | null;
  metric_weight: number | null;
}

interface Submission {
  submission_id: string;
  created_at: string;
  user_id: string | null;
  user_name: string | null;
  avatar_url: string | null;
  scores: FormattedScore[];
  weighted_average: number;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const supabase = supabaseApi(req, res);

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { applicant_round_id } = req.body;

  if (!applicant_round_id) {
    return res.status(400).json({ error: "Missing applicant_round_id" });
  }

  try {
    // First, get the applicant_round to find the applicant_id and recruitment_round_id
    const { data: applicantRoundResult, error: roundError } = await supabase
      .from("applicant_rounds")
      .select(`
        id,
        applicant_id,
        status,
        recruitment_round_id,
        recruitment_rounds!applicant_rounds_recruitment_round_id_fkey (
          id,
          name,
          column_order,
          recruitment_cycle_id,
          recruitment_cycles!fk_recruitment_cycle (
            id,
            name,
            organization_id
          )
        )
      `)
      .eq("id", applicant_round_id)
      .single();

    if (roundError || !applicantRoundResult) {
      console.error("Error fetching applicant_round:", roundError);
      return res.status(404).json({ error: "Applicant round not found" });
    }

    // Cast to our expected type
    const applicantRound = applicantRoundResult as unknown as ApplicantRoundWithRelations;

    // Extract organization_id from the nested data
    const recruitmentRound = applicantRound.recruitment_rounds;
    const recruitmentCycle = recruitmentRound?.recruitment_cycles;
    const organizationId = recruitmentCycle?.organization_id;

    if (!organizationId || !recruitmentRound || !recruitmentCycle) {
      return res.status(404).json({ error: "Organization not found" });
    }

    // Check if user is a member of the organization
    const { data: membershipResult, error: membershipError } = await supabase
      .from("organization_users")
      .select("id, role")
      .eq("organization_id", organizationId)
      .eq("user_id", user.id)
      .single();

    if (membershipError || !membershipResult) {
      return res.status(403).json({ error: "Not authorized to view this applicant" });
    }

    const membership = membershipResult as Pick<OrganizationUser, "id" | "role">;

    // Fetch the applicant data
    const { data: applicantResult, error: applicantError } = await supabase
      .from("applicants")
      .select("*")
      .eq("id", applicantRound.applicant_id)
      .single();

    if (applicantError || !applicantResult) {
      console.error("Error fetching applicant:", applicantError);
      return res.status(404).json({ error: "Applicant not found" });
    }

    const applicant = applicantResult as Applicant;

    // Fetch all comments for this applicant across all rounds
    const { data: allRoundsResult, error: allRoundsError } = await supabase
      .from("applicant_rounds")
      .select(`
        id,
        recruitment_round_id,
        status,
        comments (
          id,
          user_id,
          comment_text,
          created_at,
          updated_at,
          source,
          user:users!comments_user_id_fkey (
            full_name,
            avatar_url
          )
        ),
        recruitment_rounds!applicant_rounds_recruitment_round_id_fkey (
          name
        )
      `)
      .eq("applicant_id", applicantRound.applicant_id);

    if (allRoundsError) {
      console.error("Error fetching rounds:", allRoundsError);
    }

    // Cast to our expected type
    const allRounds = (allRoundsResult || []) as unknown as RoundWithComments[];

    // Format comments
    const allComments: FormattedComment[] = [];
    for (const round of allRounds) {
      const roundName = round.recruitment_rounds?.name ?? null;
      for (const c of round.comments ?? []) {
        allComments.push({
          id: c.id,
          user_id: c.user_id,
          comment_text: c.comment_text,
          created_at: c.created_at,
          updated_at: c.updated_at,
          user_name: c.user?.full_name ?? null,
          avatar_url: c.user?.avatar_url ?? null,
          round_name: roundName,
          source: c.source,
          is_edited: c.updated_at ? new Date(c.updated_at) > new Date(c.created_at) : false,
        });
      }
    }

    // Sort comments by created_at (earliest to latest)
    allComments.sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    // Fetch scores for this applicant_round
    const { data: scoresResult, error: scoresError } = await supabase
      .from("scores")
      .select(`
        id,
        score_value,
        submission_id,
        created_at,
        user_id,
        metric_id,
        metrics!scores_metric_id_fkey (
          name,
          weight
        ),
        user:users!scores_user_id_fkey (
          full_name,
          avatar_url
        )
      `)
      .eq("applicant_round_id", applicant_round_id);

    if (scoresError) {
      console.error("Error fetching scores:", scoresError);
    }

    // Cast to our expected type
    const scoresData = (scoresResult || []) as unknown as ScoreWithRelations[];

    // Group scores by submission_id
    const submissionsMap = new Map<string, Submission>();
    for (const score of scoresData) {
      const submissionId = score.submission_id || score.id;
      if (!submissionsMap.has(submissionId)) {
        submissionsMap.set(submissionId, {
          submission_id: submissionId,
          created_at: score.created_at,
          user_id: score.user_id,
          user_name: score.user?.full_name || null,
          avatar_url: score.user?.avatar_url || null,
          scores: [],
          weighted_average: 0,
        });
      }
      const submission = submissionsMap.get(submissionId)!;
      submission.scores.push({
        score_id: score.id,
        metric_id: score.metric_id,
        metric_name: score.metrics?.name || null,
        score_value: score.score_value,
        metric_weight: score.metrics?.weight || null,
      });
    }

    // Calculate weighted averages for each submission
    const submissions: Submission[] = Array.from(submissionsMap.values()).map((submission) => {
      let totalWeightedScore = 0;
      let totalWeight = 0;
      for (const score of submission.scores) {
        if (score.score_value !== null && score.metric_weight !== null) {
          totalWeightedScore += score.score_value * score.metric_weight;
          totalWeight += score.metric_weight;
        }
      }
      return {
        ...submission,
        weighted_average: totalWeight > 0 ? totalWeightedScore / totalWeight : 0,
      };
    });

    // Sort submissions by created_at (newest first)
    submissions.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    // Fetch metrics for this recruitment round
    const { data: metricsData, error: metricsError } = await supabase
      .from("metrics")
      .select("id, name, weight")
      .eq("recruitment_round_id", applicantRound.recruitment_round_id)
      .order("created_at", { ascending: true });

    if (metricsError) {
      console.error("Error fetching metrics:", metricsError);
    }

    return res.status(200).json({
      applicant: {
        id: applicant.id,
        name: applicant.name,
        email: applicant.email,
        headshot_url: applicant.headshot_url,
        data: applicant.data,
      },
      applicant_round: {
        id: applicantRound.id,
        status: applicantRound.status,
      },
      recruitment_round: {
        id: recruitmentRound.id,
        name: recruitmentRound.name,
        column_order: recruitmentRound.column_order,
      },
      recruitment_cycle: {
        id: recruitmentCycle.id,
        name: recruitmentCycle.name,
      },
      organization_id: organizationId,
      comments: allComments,
      scores: submissions,
      metrics: metricsData || [],
      user_role: membership.role,
    });
  } catch (error) {
    console.error("Error in interview/get:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
