export type ApplicantCardType = {
  applicant_round_id: string;
  applicant_id: string;
  name: string;
  headshot_url: string;
  email: string;
  status: string;
  current_round_weighted?: number | null; // Add this
  last_round_weighted?: number | null;
};
