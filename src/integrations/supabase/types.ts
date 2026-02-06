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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          images: string[] | null
          role: string
          session_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          images?: string[] | null
          role: string
          session_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          images?: string[] | null
          role?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      device_fingerprints: {
        Row: {
          accounts_count: number
          block_count: number
          block_expires_at: string | null
          block_reason: string | null
          created_at: string
          fingerprint_hash: string
          first_seen_at: string
          id: string
          is_blocked: boolean
          last_seen_at: string
          metadata: Json | null
          risk_score: number
        }
        Insert: {
          accounts_count?: number
          block_count?: number
          block_expires_at?: string | null
          block_reason?: string | null
          created_at?: string
          fingerprint_hash: string
          first_seen_at?: string
          id?: string
          is_blocked?: boolean
          last_seen_at?: string
          metadata?: Json | null
          risk_score?: number
        }
        Update: {
          accounts_count?: number
          block_count?: number
          block_expires_at?: string | null
          block_reason?: string | null
          created_at?: string
          fingerprint_hash?: string
          first_seen_at?: string
          id?: string
          is_blocked?: boolean
          last_seen_at?: string
          metadata?: Json | null
          risk_score?: number
        }
        Relationships: []
      }
      login_attempts: {
        Row: {
          attempt_type: string
          behavior_score: number | null
          created_at: string
          email: string | null
          failure_reason: string | null
          fingerprint_hash: string
          id: string
          ip_address: string | null
          success: boolean
          user_agent: string | null
        }
        Insert: {
          attempt_type?: string
          behavior_score?: number | null
          created_at?: string
          email?: string | null
          failure_reason?: string | null
          fingerprint_hash: string
          id?: string
          ip_address?: string | null
          success?: boolean
          user_agent?: string | null
        }
        Update: {
          attempt_type?: string
          behavior_score?: number | null
          created_at?: string
          email?: string | null
          failure_reason?: string | null
          fingerprint_hash?: string
          id?: string
          ip_address?: string | null
          success?: boolean
          user_agent?: string | null
        }
        Relationships: []
      }
      payment_packages: {
        Row: {
          created_at: string
          description: string | null
          duration_days: number | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          package_type: string
          price: number
          questions_count: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_days?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          package_type?: string
          price: number
          questions_count: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_days?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          package_type?: string
          price?: number
          questions_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      payment_requests: {
        Row: {
          admin_note: string | null
          amount: number
          bill_image_url: string | null
          created_at: string
          id: string
          package_id: string | null
          questions_count: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          amount: number
          bill_image_url?: string | null
          created_at?: string
          id?: string
          package_id?: string | null
          questions_count: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          amount?: number
          bill_image_url?: string | null
          created_at?: string
          id?: string
          package_id?: string | null
          questions_count?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_requests_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "payment_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      security_audit_log: {
        Row: {
          created_at: string
          details: Json | null
          event_type: string
          fingerprint_hash: string | null
          id: string
          ip_address: string | null
          severity: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          details?: Json | null
          event_type: string
          fingerprint_hash?: string | null
          id?: string
          ip_address?: string | null
          severity?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          details?: Json | null
          event_type?: string
          fingerprint_hash?: string | null
          id?: string
          ip_address?: string | null
          severity?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_devices: {
        Row: {
          created_at: string
          fingerprint_id: string
          first_login_at: string
          id: string
          ip_address: string | null
          is_trusted: boolean
          last_login_at: string
          login_count: number
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          fingerprint_id: string
          first_login_at?: string
          id?: string
          ip_address?: string | null
          is_trusted?: boolean
          last_login_at?: string
          login_count?: number
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          fingerprint_id?: string
          first_login_at?: string
          id?: string
          ip_address?: string | null
          is_trusted?: boolean
          last_login_at?: string
          login_count?: number
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_devices_fingerprint_id_fkey"
            columns: ["fingerprint_id"]
            isOneToOne: false
            referencedRelation: "device_fingerprints"
            referencedColumns: ["id"]
          },
        ]
      }
      user_quotas: {
        Row: {
          bonus_questions: number
          created_at: string
          daily_limit: number
          id: string
          last_month_reset: string
          last_reset_date: string
          monthly_limit: number | null
          plan_expires_at: string | null
          plan_type: string | null
          questions_used_month: number
          questions_used_today: number
          updated_at: string
          user_id: string
        }
        Insert: {
          bonus_questions?: number
          created_at?: string
          daily_limit?: number
          id?: string
          last_month_reset?: string
          last_reset_date?: string
          monthly_limit?: number | null
          plan_expires_at?: string | null
          plan_type?: string | null
          questions_used_month?: number
          questions_used_today?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          bonus_questions?: number
          created_at?: string
          daily_limit?: number
          id?: string
          last_month_reset?: string
          last_reset_date?: string
          monthly_limit?: number | null
          plan_expires_at?: string | null
          plan_type?: string | null
          questions_used_month?: number
          questions_used_today?: number
          updated_at?: string
          user_id?: string
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
          role?: Database["public"]["Enums"]["app_role"]
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
      add_bonus_questions: {
        Args: { _amount: number; _user_id: string }
        Returns: undefined
      }
      check_and_use_quota: { Args: { _user_id: string }; Returns: boolean }
      check_device_blocked: {
        Args: { p_fingerprint_hash: string }
        Returns: Json
      }
      get_device_account_count: {
        Args: { p_fingerprint_hash: string }
        Returns: number
      }
      get_remaining_quota: { Args: { _user_id: string }; Returns: Json }
      get_user_email: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      link_user_device: {
        Args: {
          p_fingerprint_hash: string
          p_ip_address: string
          p_user_agent: string
          p_user_id: string
        }
        Returns: undefined
      }
      record_login_attempt: {
        Args: {
          p_behavior_score?: number
          p_email: string
          p_failure_reason?: string
          p_fingerprint_hash: string
          p_ip_address: string
          p_success: boolean
          p_user_agent: string
        }
        Returns: Json
      }
      register_device_account: {
        Args: { p_fingerprint_hash: string; p_metadata?: Json }
        Returns: Json
      }
      reset_daily_quotas: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
