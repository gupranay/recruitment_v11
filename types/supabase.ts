export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      scores: {
        Row: {
          id: string;
          applicant_round_id: string;
          metric_id: string;
          score_value: number;
          user_id: string | null;
          created_at: string;
          submission_id: string | null;
        };
        Insert: {
          id?: string;
          applicant_round_id: string;
          metric_id: string;
          score_value: number;
          user_id?: string | null;
          created_at?: string;
          submission_id?: string | null;
        };
        Update: {
          id?: string;
          applicant_round_id?: string;
          metric_id?: string;
          score_value?: number;
          user_id?: string | null;
          created_at?: string;
          submission_id?: string | null;
        };
      };
    };
  };
}
