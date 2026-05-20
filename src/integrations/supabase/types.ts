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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      change_log: {
        Row: {
          author_id: string | null
          author_name: string | null
          created_at: string
          entity_id: string | null
          entity_label: string | null
          entity_type: string
          id: string
          summary: string
        }
        Insert: {
          author_id?: string | null
          author_name?: string | null
          created_at?: string
          entity_id?: string | null
          entity_label?: string | null
          entity_type: string
          id?: string
          summary: string
        }
        Update: {
          author_id?: string | null
          author_name?: string | null
          created_at?: string
          entity_id?: string | null
          entity_label?: string | null
          entity_type?: string
          id?: string
          summary?: string
        }
        Relationships: []
      }
      claims_tracking: {
        Row: {
          created_at: string
          created_by: string
          created_by_name: string | null
          follow_up_date: string
          id: string
          notes: string
          payer_id: string | null
          resolved_at: string | null
          run_number: string
          run_numbers: string[]
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          created_by_name?: string | null
          follow_up_date?: string
          id?: string
          notes?: string
          payer_id?: string | null
          resolved_at?: string | null
          run_number: string
          run_numbers?: string[]
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          created_by_name?: string | null
          follow_up_date?: string
          id?: string
          notes?: string
          payer_id?: string | null
          resolved_at?: string | null
          run_number?: string
          run_numbers?: string[]
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "claims_tracking_payer_id_fkey"
            columns: ["payer_id"]
            isOneToOne: false
            referencedRelation: "payers"
            referencedColumns: ["id"]
          },
        ]
      }
      denial_guides: {
        Row: {
          appeal_template: string | null
          archived: boolean
          created_at: string
          denial_code: string | null
          denial_reason: string
          how_to_fix: string
          id: string
          payer_id: string | null
          required_attachments: string | null
          search_text: unknown
          training_article_id: string | null
          updated_at: string
        }
        Insert: {
          appeal_template?: string | null
          archived?: boolean
          created_at?: string
          denial_code?: string | null
          denial_reason: string
          how_to_fix: string
          id?: string
          payer_id?: string | null
          required_attachments?: string | null
          search_text?: unknown
          training_article_id?: string | null
          updated_at?: string
        }
        Update: {
          appeal_template?: string | null
          archived?: boolean
          created_at?: string
          denial_code?: string | null
          denial_reason?: string
          how_to_fix?: string
          id?: string
          payer_id?: string | null
          required_attachments?: string | null
          search_text?: unknown
          training_article_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "denial_guides_payer_id_fkey"
            columns: ["payer_id"]
            isOneToOne: false
            referencedRelation: "payers"
            referencedColumns: ["id"]
          },
        ]
      }
      invoicing_call_types: {
        Row: {
          archived: boolean
          billing_tab: string
          created_at: string
          dispatch_tab: string
          id: string
          medical_tab: string
          name: string
          natures: string[]
          notes: string
          payer_specific_rules: string
          required_paperwork: string
          screenshots: Json
          training_article_id: string | null
          updated_at: string
        }
        Insert: {
          archived?: boolean
          billing_tab?: string
          created_at?: string
          dispatch_tab?: string
          id?: string
          medical_tab?: string
          name: string
          natures?: string[]
          notes?: string
          payer_specific_rules?: string
          required_paperwork?: string
          screenshots?: Json
          training_article_id?: string | null
          updated_at?: string
        }
        Update: {
          archived?: boolean
          billing_tab?: string
          created_at?: string
          dispatch_tab?: string
          id?: string
          medical_tab?: string
          name?: string
          natures?: string[]
          notes?: string
          payer_specific_rules?: string
          required_paperwork?: string
          screenshots?: Json
          training_article_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      payer_requests: {
        Row: {
          added_to_traumasoft: boolean
          admin_notes: string | null
          claims_address: string
          created_at: string
          created_payer_id: string | null
          electronic_payer_id: string | null
          fax: string | null
          id: string
          insurance_name: string
          phone: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          run_number: string
          status: string
          submitter_email: string | null
          submitter_id: string
          updated_at: string
        }
        Insert: {
          added_to_traumasoft?: boolean
          admin_notes?: string | null
          claims_address: string
          created_at?: string
          created_payer_id?: string | null
          electronic_payer_id?: string | null
          fax?: string | null
          id?: string
          insurance_name: string
          phone?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          run_number: string
          status?: string
          submitter_email?: string | null
          submitter_id: string
          updated_at?: string
        }
        Update: {
          added_to_traumasoft?: boolean
          admin_notes?: string | null
          claims_address?: string
          created_at?: string
          created_payer_id?: string | null
          electronic_payer_id?: string | null
          fax?: string | null
          id?: string
          insurance_name?: string
          phone?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          run_number?: string
          status?: string
          submitter_email?: string | null
          submitter_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      payer_rules: {
        Row: {
          archived: boolean
          body: string
          category: string | null
          created_at: string
          id: string
          last_reviewed_at: string | null
          payer_id: string
          search_text: unknown
          title: string
          updated_at: string
        }
        Insert: {
          archived?: boolean
          body: string
          category?: string | null
          created_at?: string
          id?: string
          last_reviewed_at?: string | null
          payer_id: string
          search_text?: unknown
          title: string
          updated_at?: string
        }
        Update: {
          archived?: boolean
          body?: string
          category?: string | null
          created_at?: string
          id?: string
          last_reviewed_at?: string | null
          payer_id?: string
          search_text?: unknown
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payer_rules_payer_id_fkey"
            columns: ["payer_id"]
            isOneToOne: false
            referencedRelation: "payers"
            referencedColumns: ["id"]
          },
        ]
      }
      payers: {
        Row: {
          appeal_limit_days: number | null
          appeals_address: string | null
          archived: boolean
          broker_name: string | null
          broker_notes: string | null
          claims_address: string | null
          common_denial_reasons: string | null
          created_at: string
          documentation_requirements: string | null
          electronic_payer_id: string | null
          id: string
          internal_notes: string | null
          last_reviewed_at: string | null
          medical_records_submission: string | null
          medical_records_training_id: string | null
          name: string
          payer_type: string
          pcs_notes: string | null
          pcs_required: boolean
          portal_notes: string | null
          portal_url: string | null
          prior_auth_hcpcs: string | null
          prior_auth_modifiers: string | null
          prior_auth_notes: string | null
          prior_auth_required: boolean
          prior_auth_training_id: string | null
          search_text: unknown
          secondary_claims_submission: string | null
          secondary_claims_training_id: string | null
          source_links: Json
          timely_filing_days: number | null
          training_article_id: string | null
          updated_at: string
          uses_broker: boolean
          wc_claim_training_id: string | null
          wc_denial_training_id: string | null
          wheelchair_claims: boolean
          wheelchair_notes: string | null
        }
        Insert: {
          appeal_limit_days?: number | null
          appeals_address?: string | null
          archived?: boolean
          broker_name?: string | null
          broker_notes?: string | null
          claims_address?: string | null
          common_denial_reasons?: string | null
          created_at?: string
          documentation_requirements?: string | null
          electronic_payer_id?: string | null
          id?: string
          internal_notes?: string | null
          last_reviewed_at?: string | null
          medical_records_submission?: string | null
          medical_records_training_id?: string | null
          name: string
          payer_type: string
          pcs_notes?: string | null
          pcs_required?: boolean
          portal_notes?: string | null
          portal_url?: string | null
          prior_auth_hcpcs?: string | null
          prior_auth_modifiers?: string | null
          prior_auth_notes?: string | null
          prior_auth_required?: boolean
          prior_auth_training_id?: string | null
          search_text?: unknown
          secondary_claims_submission?: string | null
          secondary_claims_training_id?: string | null
          source_links?: Json
          timely_filing_days?: number | null
          training_article_id?: string | null
          updated_at?: string
          uses_broker?: boolean
          wc_claim_training_id?: string | null
          wc_denial_training_id?: string | null
          wheelchair_claims?: boolean
          wheelchair_notes?: string | null
        }
        Update: {
          appeal_limit_days?: number | null
          appeals_address?: string | null
          archived?: boolean
          broker_name?: string | null
          broker_notes?: string | null
          claims_address?: string | null
          common_denial_reasons?: string | null
          created_at?: string
          documentation_requirements?: string | null
          electronic_payer_id?: string | null
          id?: string
          internal_notes?: string | null
          last_reviewed_at?: string | null
          medical_records_submission?: string | null
          medical_records_training_id?: string | null
          name?: string
          payer_type?: string
          pcs_notes?: string | null
          pcs_required?: boolean
          portal_notes?: string | null
          portal_url?: string | null
          prior_auth_hcpcs?: string | null
          prior_auth_modifiers?: string | null
          prior_auth_notes?: string | null
          prior_auth_required?: boolean
          prior_auth_training_id?: string | null
          search_text?: unknown
          secondary_claims_submission?: string | null
          secondary_claims_training_id?: string | null
          source_links?: Json
          timely_filing_days?: number | null
          training_article_id?: string | null
          updated_at?: string
          uses_broker?: boolean
          wc_claim_training_id?: string | null
          wc_denial_training_id?: string | null
          wheelchair_claims?: boolean
          wheelchair_notes?: string | null
        }
        Relationships: []
      }
      policies: {
        Row: {
          archived: boolean
          body: string
          created_at: string
          id: string
          published: boolean
          published_at: string | null
          title: string
          training_article_id: string | null
          updated_at: string
        }
        Insert: {
          archived?: boolean
          body?: string
          created_at?: string
          id?: string
          published?: boolean
          published_at?: string | null
          title: string
          training_article_id?: string | null
          updated_at?: string
        }
        Update: {
          archived?: boolean
          body?: string
          created_at?: string
          id?: string
          published?: boolean
          published_at?: string | null
          title?: string
          training_article_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      policy_acknowledgements: {
        Row: {
          created_at: string
          id: string
          policy_id: string
          signed_at: string
          signed_name: string
          user_display_name: string | null
          user_email: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          policy_id: string
          signed_at: string
          signed_name: string
          user_display_name?: string | null
          user_email?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          policy_id?: string
          signed_at?: string
          signed_name?: string
          user_display_name?: string | null
          user_email?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          first_login_at: string | null
          id: string
          login_count: number
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          first_login_at?: string | null
          id: string
          login_count?: number
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          first_login_at?: string | null
          id?: string
          login_count?: number
        }
        Relationships: []
      }
      reminders: {
        Row: {
          completed: boolean
          created_at: string
          due_at: string | null
          id: string
          notes: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          due_at?: string | null
          id?: string
          notes?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          due_at?: string | null
          id?: string
          notes?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      suggestions: {
        Row: {
          admin_notes: string | null
          body: string
          created_at: string
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["suggestion_status"]
          submitter_email: string | null
          submitter_id: string
          target_id: string | null
          target_label: string | null
          target_type: Database["public"]["Enums"]["suggestion_target"]
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          body: string
          created_at?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["suggestion_status"]
          submitter_email?: string | null
          submitter_id: string
          target_id?: string | null
          target_label?: string | null
          target_type: Database["public"]["Enums"]["suggestion_target"]
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          body?: string
          created_at?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["suggestion_status"]
          submitter_email?: string | null
          submitter_id?: string
          target_id?: string | null
          target_label?: string | null
          target_type?: Database["public"]["Enums"]["suggestion_target"]
          updated_at?: string
        }
        Relationships: []
      }
      training_articles: {
        Row: {
          archived: boolean
          attachments: Json
          body: string
          category: string
          created_at: string
          id: string
          search_text: unknown
          title: string
          updated_at: string
        }
        Insert: {
          archived?: boolean
          attachments?: Json
          body: string
          category: string
          created_at?: string
          id?: string
          search_text?: unknown
          title: string
          updated_at?: string
        }
        Update: {
          archived?: boolean
          attachments?: Json
          body?: string
          category?: string
          created_at?: string
          id?: string
          search_text?: unknown
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_authed: { Args: { _user_id: string }; Returns: boolean }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "editor" | "viewer" | "claims_tracker"
      suggestion_status: "pending" | "approved" | "rejected"
      suggestion_target: "payer" | "payer_rule" | "denial_guide"
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
      app_role: ["admin", "editor", "viewer", "claims_tracker"],
      suggestion_status: ["pending", "approved", "rejected"],
      suggestion_target: ["payer", "payer_rule", "denial_guide"],
    },
  },
} as const
