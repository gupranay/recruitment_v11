export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
        }
        Insert: {
          applicant_id: string
          created_at?: string
          id?: string
          recruitment_round_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          applicant_id?: string
          created_at?: string
          id?: string
          recruitment_round_id?: string
          status?: string
          updated_at?: string
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
          is_anonymous: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          applicant_round_id: string
          comment_text: string
          created_at?: string
          id?: string
          is_anonymous?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          applicant_round_id?: string
          comment_text?: string
          created_at?: string
          id?: string
          is_anonymous?: boolean | null
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
      metrics: {
        Row: {
          created_at: string
          id: string
          name: string
          recruitment_cycle_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          recruitment_cycle_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          recruitment_cycle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "metrics_recruitment_cycle_id_fkey"
            columns: ["recruitment_cycle_id"]
            isOneToOne: false
            referencedRelation: "recruitment_cycles"
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
        Relationships: []
      }
      recruitment_cycles: {
        Row: {
          created_at: string | null
          id: string
          name: string
          organization_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          organization_id?: string | null
        }
        Update: {
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
          created_at: string | null
          id: string
          name: string
          recruitment_cycle_id: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          recruitment_cycle_id: string
          sort_order?: number | null
        }
        Update: {
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
          user_id: string | null
        }
        Insert: {
          applicant_round_id: string
          created_at?: string
          id?: string
          metric_id: string
          score_value?: number | null
          user_id?: string | null
        }
        Update: {
          applicant_round_id?: string
          created_at?: string
          id?: string
          metric_id?: string
          score_value?: number | null
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
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      role_type: "Owner" | "Admin" | "Member"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
