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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      calendar_cache: {
        Row: {
          attendees: Json | null
          body: string | null
          created_at: string | null
          end_time: string | null
          event_id: string
          id: string
          importance: string | null
          is_all_day: boolean | null
          is_online: boolean | null
          location: string | null
          online_meeting_url: string | null
          organizer_email: string | null
          organizer_name: string | null
          provider: string | null
          show_as: string | null
          start_time: string | null
          subject: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          attendees?: Json | null
          body?: string | null
          created_at?: string | null
          end_time?: string | null
          event_id: string
          id?: string
          importance?: string | null
          is_all_day?: boolean | null
          is_online?: boolean | null
          location?: string | null
          online_meeting_url?: string | null
          organizer_email?: string | null
          organizer_name?: string | null
          provider?: string | null
          show_as?: string | null
          start_time?: string | null
          subject?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          attendees?: Json | null
          body?: string | null
          created_at?: string | null
          end_time?: string | null
          event_id?: string
          id?: string
          importance?: string | null
          is_all_day?: boolean | null
          is_online?: boolean | null
          location?: string | null
          online_meeting_url?: string | null
          organizer_email?: string | null
          organizer_name?: string | null
          provider?: string | null
          show_as?: string | null
          start_time?: string | null
          subject?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_cache_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          metadata: Json | null
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_cache: {
        Row: {
          ai_categories: string[] | null
          ai_priority: string | null
          ai_suggested_action: string | null
          ai_summary: string | null
          analyzed_at: string | null
          created_at: string | null
          email_id: string
          id: string
          is_read: boolean | null
          preview: string | null
          provider: string | null
          received_at: string | null
          sender_email: string | null
          sender_name: string | null
          subject: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ai_categories?: string[] | null
          ai_priority?: string | null
          ai_suggested_action?: string | null
          ai_summary?: string | null
          analyzed_at?: string | null
          created_at?: string | null
          email_id: string
          id?: string
          is_read?: boolean | null
          preview?: string | null
          provider?: string | null
          received_at?: string | null
          sender_email?: string | null
          sender_name?: string | null
          subject?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ai_categories?: string[] | null
          ai_priority?: string | null
          ai_suggested_action?: string | null
          ai_summary?: string | null
          analyzed_at?: string | null
          created_at?: string | null
          email_id?: string
          id?: string
          is_read?: boolean | null
          preview?: string | null
          provider?: string | null
          received_at?: string | null
          sender_email?: string | null
          sender_name?: string | null
          subject?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_cache_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      odoo_invoices_cache: {
        Row: {
          ai_priority: string | null
          ai_suggested_action: string | null
          ai_summary: string | null
          amount_residual: number | null
          amount_total: number | null
          analyzed_at: string | null
          created_at: string | null
          currency: string | null
          currency_symbol: string | null
          days_overdue: number | null
          id: string
          invoice_date: string | null
          invoice_date_due: string | null
          is_overdue: boolean | null
          line_count: number | null
          move_type: string | null
          name: string | null
          odoo_id: number
          partner_id: number | null
          partner_name: string | null
          payment_state: string | null
          provider: string | null
          raw_data: Json | null
          state: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ai_priority?: string | null
          ai_suggested_action?: string | null
          ai_summary?: string | null
          amount_residual?: number | null
          amount_total?: number | null
          analyzed_at?: string | null
          created_at?: string | null
          currency?: string | null
          currency_symbol?: string | null
          days_overdue?: number | null
          id?: string
          invoice_date?: string | null
          invoice_date_due?: string | null
          is_overdue?: boolean | null
          line_count?: number | null
          move_type?: string | null
          name?: string | null
          odoo_id: number
          partner_id?: number | null
          partner_name?: string | null
          payment_state?: string | null
          provider?: string | null
          raw_data?: Json | null
          state?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ai_priority?: string | null
          ai_suggested_action?: string | null
          ai_summary?: string | null
          amount_residual?: number | null
          amount_total?: number | null
          analyzed_at?: string | null
          created_at?: string | null
          currency?: string | null
          currency_symbol?: string | null
          days_overdue?: number | null
          id?: string
          invoice_date?: string | null
          invoice_date_due?: string | null
          is_overdue?: boolean | null
          line_count?: number | null
          move_type?: string | null
          name?: string | null
          odoo_id?: number
          partner_id?: number | null
          partner_name?: string | null
          payment_state?: string | null
          provider?: string | null
          raw_data?: Json | null
          state?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "odoo_invoices_cache_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      odoo_mcp_actions: {
        Row: {
          error_message: string | null
          executed_at: string | null
          id: string
          input_args: Json | null
          model_name: string | null
          record_id: number | null
          record_name: string | null
          result: Json | null
          success: boolean | null
          tool_name: string
          user_id: string
        }
        Insert: {
          error_message?: string | null
          executed_at?: string | null
          id?: string
          input_args?: Json | null
          model_name?: string | null
          record_id?: number | null
          record_name?: string | null
          result?: Json | null
          success?: boolean | null
          tool_name: string
          user_id: string
        }
        Update: {
          error_message?: string | null
          executed_at?: string | null
          id?: string
          input_args?: Json | null
          model_name?: string | null
          record_id?: number | null
          record_name?: string | null
          result?: Json | null
          success?: boolean | null
          tool_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "odoo_mcp_actions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      odoo_rfp_cache: {
        Row: {
          ai_priority: string | null
          ai_risk_factors: Json | null
          ai_suggested_action: string | null
          ai_summary: string | null
          amount_total: number | null
          analyzed_at: string | null
          created_at: string | null
          currency: string | null
          currency_symbol: string | null
          date_order: string | null
          id: string
          line_count: number | null
          name: string | null
          odoo_id: number
          origin: string | null
          provider: string | null
          raw_data: Json | null
          state: string | null
          updated_at: string | null
          user_id: string
          vendor_id: number | null
          vendor_name: string | null
        }
        Insert: {
          ai_priority?: string | null
          ai_risk_factors?: Json | null
          ai_suggested_action?: string | null
          ai_summary?: string | null
          amount_total?: number | null
          analyzed_at?: string | null
          created_at?: string | null
          currency?: string | null
          currency_symbol?: string | null
          date_order?: string | null
          id?: string
          line_count?: number | null
          name?: string | null
          odoo_id: number
          origin?: string | null
          provider?: string | null
          raw_data?: Json | null
          state?: string | null
          updated_at?: string | null
          user_id: string
          vendor_id?: number | null
          vendor_name?: string | null
        }
        Update: {
          ai_priority?: string | null
          ai_risk_factors?: Json | null
          ai_suggested_action?: string | null
          ai_summary?: string | null
          amount_total?: number | null
          analyzed_at?: string | null
          created_at?: string | null
          currency?: string | null
          currency_symbol?: string | null
          date_order?: string | null
          id?: string
          line_count?: number | null
          name?: string | null
          odoo_id?: number
          origin?: string | null
          provider?: string | null
          raw_data?: Json | null
          state?: string | null
          updated_at?: string | null
          user_id?: string
          vendor_id?: number | null
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "odoo_rfp_cache_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      odoo_sales_cache: {
        Row: {
          ai_priority: string | null
          ai_suggested_action: string | null
          ai_summary: string | null
          amount_total: number | null
          analyzed_at: string | null
          created_at: string | null
          currency: string | null
          currency_symbol: string | null
          customer_id: number | null
          customer_name: string | null
          date_order: string | null
          id: string
          invoice_status: string | null
          line_count: number | null
          name: string | null
          odoo_id: number
          provider: string | null
          raw_data: Json | null
          state: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ai_priority?: string | null
          ai_suggested_action?: string | null
          ai_summary?: string | null
          amount_total?: number | null
          analyzed_at?: string | null
          created_at?: string | null
          currency?: string | null
          currency_symbol?: string | null
          customer_id?: number | null
          customer_name?: string | null
          date_order?: string | null
          id?: string
          invoice_status?: string | null
          line_count?: number | null
          name?: string | null
          odoo_id: number
          provider?: string | null
          raw_data?: Json | null
          state?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ai_priority?: string | null
          ai_suggested_action?: string | null
          ai_summary?: string | null
          amount_total?: number | null
          analyzed_at?: string | null
          created_at?: string | null
          currency?: string | null
          currency_symbol?: string | null
          customer_id?: number | null
          customer_name?: string | null
          date_order?: string | null
          id?: string
          invoice_status?: string | null
          line_count?: number | null
          name?: string | null
          odoo_id?: number
          provider?: string | null
          raw_data?: Json | null
          state?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "odoo_sales_cache_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      tasks: {
        Row: {
          completed_at: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string
          priority: string | null
          status: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          status?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          status?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          calendar_connected: boolean | null
          created_at: string | null
          email_connected: boolean | null
          id: string
          notifications_desktop: boolean | null
          notifications_email: boolean | null
          notifications_push: boolean | null
          theme: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          calendar_connected?: boolean | null
          created_at?: string | null
          email_connected?: boolean | null
          id?: string
          notifications_desktop?: boolean | null
          notifications_email?: boolean | null
          notifications_push?: boolean | null
          theme?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          calendar_connected?: boolean | null
          created_at?: string | null
          email_connected?: boolean | null
          id?: string
          notifications_desktop?: boolean | null
          notifications_email?: boolean | null
          notifications_push?: boolean | null
          theme?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
