export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      anonymous_readings: {
        Row: {
          created_at: string
          id: string
          omitted_fields: string[] | null
          recruitment_round_id: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          omitted_fields?: string[] | null
          recruitment_round_id: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          omitted_fields?: string[] | null
          recruitment_round_id?: string
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "anonymous_readings_recruitment_round_id_fkey"
            columns: ["recruitment_round_id"]
            isOneToOne: false
            referencedRelation: "recruitment_rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      applicant_rounds: {
        Row: {
          applicant_id: string
          created_at: string
          id: string
          recruitment_round_id: string
          status: string
          updated_at: string
          weighted_score: number | null
        }
        Insert: {
          applicant_id: string
          created_at?: string
          id?: string
          recruitment_round_id: string
          status?: string
          updated_at?: string
          weighted_score?: number | null
        }
        Update: {
          applicant_id?: string
          created_at?: string
          id?: string
          recruitment_round_id?: string
          status?: string
          updated_at?: string
          weighted_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "applicant_rounds_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "applicants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applicant_rounds_recruitment_round_id_fkey"
            columns: ["recruitment_round_id"]
            isOneToOne: false
            referencedRelation: "recruitment_rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      applicants: {
        Row: {
          created_at: string | null
          data: Json
          email: string | null
          headshot_url: string | null
          id: string
          name: string
          recruitment_cycle_id: string | null
        }
        Insert: {
          created_at?: string | null
          data: Json
          email?: string | null
          headshot_url?: string | null
          id?: string
          name: string
          recruitment_cycle_id?: string | null
        }
        Update: {
          created_at?: string | null
          data?: Json
          email?: string | null
          headshot_url?: string | null
          id?: string
          name?: string
          recruitment_cycle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "applicants_recruitment_cycle_id_fkey"
            columns: ["recruitment_cycle_id"]
            isOneToOne: false
            referencedRelation: "recruitment_cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          applicant_round_id: string
          comment_text: string
          created_at: string
          id: string
          source: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          applicant_round_id: string
          comment_text: string
          created_at?: string
          id?: string
          source?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          applicant_round_id?: string
          comment_text?: string
          created_at?: string
          id?: string
          source?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_applicant_round_id_fkey"
            columns: ["applicant_round_id"]
            isOneToOne: false
            referencedRelation: "applicant_rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      delibs_sessions: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          locked_at: string | null
          recruitment_round_id: string
          status: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          locked_at?: string | null
          recruitment_round_id: string
          status?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          locked_at?: string | null
          recruitment_round_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "delibs_sessions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delibs_sessions_recruitment_round_id_fkey"
            columns: ["recruitment_round_id"]
            isOneToOne: true
            referencedRelation: "recruitment_rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      delibs_votes: {
        Row: {
          applicant_round_id: string
          created_at: string
          delibs_session_id: string
          id: string
          updated_at: string
          vote_value: number
          voter_user_id: string
        }
        Insert: {
          applicant_round_id: string
          created_at?: string
          delibs_session_id: string
          id?: string
          updated_at?: string
          vote_value: number
          voter_user_id: string
        }
        Update: {
          applicant_round_id?: string
          created_at?: string
          delibs_session_id?: string
          id?: string
          updated_at?: string
          vote_value?: number
          voter_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "delibs_votes_applicant_round_id_fkey"
            columns: ["applicant_round_id"]
            isOneToOne: false
            referencedRelation: "applicant_rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delibs_votes_delibs_session_id_fkey"
            columns: ["delibs_session_id"]
            isOneToOne: false
            referencedRelation: "delibs_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delibs_votes_voter_user_id_fkey"
            columns: ["voter_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      metrics: {
        Row: {
          created_at: string
          id: string
          name: string
          recruitment_round_id: string
          weight: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          recruitment_round_id: string
          weight?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          recruitment_round_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "metrics_recruitment_round_id_fkey"
            columns: ["recruitment_round_id"]
            isOneToOne: false
            referencedRelation: "recruitment_rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_invites: {
        Row: {
          created_at: string | null
          email: string
          expires_at: string | null
          id: string
          invited_by: string | null
          organization_id: string
          role: Database["public"]["Enums"]["role_type"]
        }
        Insert: {
          created_at?: string | null
          email: string
          expires_at?: string | null
          id?: string
          invited_by?: string | null
          organization_id: string
          role: Database["public"]["Enums"]["role_type"]
        }
        Update: {
          created_at?: string | null
          email?: string
          expires_at?: string | null
          id?: string
          invited_by?: string | null
          organization_id?: string
          role?: Database["public"]["Enums"]["role_type"]
        }
        Relationships: [
          {
            foreignKeyName: "organization_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_invites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_users: {
        Row: {
          created_at: string | null
          id: string
          organization_id: string | null
          role: Database["public"]["Enums"]["role_type"]
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          organization_id?: string | null
          role: Database["public"]["Enums"]["role_type"]
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          organization_id?: string | null
          role?: Database["public"]["Enums"]["role_type"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_users_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string | null
          id: string
          name: string
          owner_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          owner_id?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizations_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_cycles: {
        Row: {
          archived: boolean
          created_at: string | null
          id: string
          name: string
          organization_id: string | null
        }
        Insert: {
          archived?: boolean
          created_at?: string | null
          id?: string
          name: string
          organization_id?: string | null
        }
        Update: {
          archived?: boolean
          created_at?: string | null
          id?: string
          name?: string
          organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_cycles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_rounds: {
        Row: {
          column_order: string[] | null
          created_at: string | null
          id: string
          name: string
          recruitment_cycle_id: string
          sort_order: number | null
        }
        Insert: {
          column_order?: string[] | null
          created_at?: string | null
          id?: string
          name: string
          recruitment_cycle_id: string
          sort_order?: number | null
        }
        Update: {
          column_order?: string[] | null
          created_at?: string | null
          id?: string
          name?: string
          recruitment_cycle_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_recruitment_cycle"
            columns: ["recruitment_cycle_id"]
            isOneToOne: false
            referencedRelation: "recruitment_cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      scores: {
        Row: {
          applicant_round_id: string
          created_at: string
          id: string
          metric_id: string
          score_value: number | null
          submission_id: string | null
          user_id: string | null
        }
        Insert: {
          applicant_round_id: string
          created_at?: string
          id?: string
          metric_id: string
          score_value?: number | null
          submission_id?: string | null
          user_id?: string | null
        }
        Update: {
          applicant_round_id?: string
          created_at?: string
          id?: string
          metric_id?: string
          score_value?: number | null
          submission_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scores_applicant_round_id_fkey"
            columns: ["applicant_round_id"]
            isOneToOne: false
            referencedRelation: "applicant_rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scores_metric_id_fkey"
            columns: ["metric_id"]
            isOneToOne: false
            referencedRelation: "metrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scores_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
    }
    Views: {
      delibs_applicant_aggregates: {
        Row: {
          applicant_id: string | null
          applicant_round_id: string | null
          avg_vote: number | null
          delibs_session_id: string | null
          rank_dense: number | null
          vote_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "applicant_rounds_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "applicants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delibs_votes_applicant_round_id_fkey"
            columns: ["applicant_round_id"]
            isOneToOne: false
            referencedRelation: "applicant_rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delibs_votes_delibs_session_id_fkey"
            columns: ["delibs_session_id"]
            isOneToOne: false
            referencedRelation: "delibs_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      get_delibs_results: {
        Args: { round_id: string }
        Returns: {
          applicant_id: string
          applicant_round_id: string
          avg_vote: number
          headshot_url: string
          is_tied: boolean
          name: string
          rank_dense: number
          vote_count: number
        }[]
      }
      get_demographics: {
        Args: { field_name: string; round_id: string }
        Returns: {
          count: number
          field_value: string
          percentage: number
          status: string
        }[]
      }
      is_applicant_round_in_delibs_session: {
        Args: { applicant_round_id: string; delibs_session_id: string }
        Returns: boolean
      }
      is_delibs_session_open: { Args: { session_id: string }; Returns: boolean }
      is_org_admin_for_delibs_session: {
        Args: { session_id: string; user_id: string }
        Returns: boolean
      }
      is_org_admin_for_round: {
        Args: { round_id: string; user_id: string }
        Returns: boolean
      }
      is_org_member_for_delibs_session: {
        Args: { session_id: string; user_id: string }
        Returns: boolean
      }
      is_org_member_for_round: {
        Args: { round_id: string; user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      role_type: "Owner" | "Admin" | "Member"
      source_type: "R" | "F" | "A"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      role_type: ["Owner", "Admin", "Member"],
      source_type: ["R", "F", "A"],
    },
  },
} as const
