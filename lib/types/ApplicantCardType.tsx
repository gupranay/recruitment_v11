export type ApplicantCardType = {
  applicant_round_id: string;
  applicant_id: string;
  name: string;
  headshot_url: string;
  email: string;
  grade?: string | null;
  major?: string | null;
  status: string;
  current_round_weighted?: number | null; // Add this
  last_round_weighted?: number | null;
};
