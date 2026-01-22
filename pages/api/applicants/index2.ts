import { NextApiRequest, NextApiResponse } from "next";
import { supabaseApi } from "@/lib/supabase/api";

type ApplicantRoundWithApplicant = {
  id: string;
  applicant_id: string;
  status: string;
  weighted_score: number | null;
  applicants: {
    id: string;
    name: string;
    headshot_url: string | null;
    email: string | null;
  } | null;
};

type ApplicantRoundBasic = {
  applicant_id: string;
  weighted_score: number | null;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only accept POST
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

  const { recruitment_round_id, last_round_id } = req.body;

  if (!recruitment_round_id) {
    return res
      .status(400)
      .json({ error: "Missing required field: recruitment_round_id" });
  }

  try {
    // -----------------------------
    // Step A: fetch bridging rows for the "current" round
    // -----------------------------
    const { data: currentRoundData, error: currentRoundError } = await supabase
      .from("applicant_rounds")
      .select(
        `
        id,
        applicant_id,
        status,
        weighted_score,
        applicants (
          id,
          name,
          headshot_url,
          email
        )
      `
      )
      .eq("recruitment_round_id", recruitment_round_id) as {
      data: ApplicantRoundWithApplicant[] | null;
      error: any;
    };

    if (currentRoundError) {
      console.error(
        "Error fetching applicants for current round:",
        currentRoundError.message
      );
      return res.status(400).json({ error: currentRoundError.message });
    }

    if (!currentRoundData || currentRoundData.length === 0) {
      return res.status(200).json([]);
    }

    // Create a map: applicant_id -> bridging row info
    const resultsMap: Record<
      string,
      {
        applicant_round_id: string;
        applicant_id: string;
        name: string | null;
        headshot_url: string | null;
        email: string | null;
        status: string | null;
        current_round_weighted: number | null;
        last_round_weighted: number | null;
      }
    > = {};

    for (const item of currentRoundData) {
      const aId = item.applicant_id;
      resultsMap[aId] = {
        applicant_round_id: item.id,
        applicant_id: aId,
        name: item.applicants?.name ?? null,
        headshot_url: item.applicants?.headshot_url ?? null,
        email: item.applicants?.email ?? null,
        status: item.status ?? null,
        current_round_weighted: item.weighted_score ?? null,
        last_round_weighted: null,
      };
    }

    // -----------------------------
    // Step B: If last_round_id is provided, fetch bridging rows for that round
    // -----------------------------
    if (last_round_id) {
      const applicantIds = Object.keys(resultsMap);
      if (applicantIds.length > 0) {
        const { data: lastRoundData, error: lastRoundError } = await supabase
          .from("applicant_rounds")
          .select(
            `
            applicant_id,
            weighted_score
          `
          )
          .eq("recruitment_round_id", last_round_id)
          .in("applicant_id", applicantIds) as {
          data: ApplicantRoundBasic[] | null;
          error: any;
        };

        if (lastRoundError) {
          console.error(
            "Error fetching last round bridging rows:",
            lastRoundError.message
          );
          return res.status(400).json({ error: lastRoundError.message });
        }

        if (lastRoundData && lastRoundData.length > 0) {
          for (const row of lastRoundData) {
            const aId = row.applicant_id;
            if (resultsMap[aId]) {
              resultsMap[aId].last_round_weighted = row.weighted_score ?? null;
            }
          }
        }
      }
    }

    // -----------------------------
    // Convert resultsMap to an array
    // -----------------------------
    const finalResult = Object.values(resultsMap);

    return res.status(200).json(finalResult);
  } catch (err) {
    console.error("Unexpected error in index2 applicants:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
