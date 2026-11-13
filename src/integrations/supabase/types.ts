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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      districts: {
        Row: {
          id: string
          is_ardc: boolean | null
          lat: number
          lng: number
          name_en: string
          name_ps: string | null
          name_ur: string
          region: string | null
          slug: string
        }
        Insert: {
          id: string
          is_ardc?: boolean | null
          lat: number
          lng: number
          name_en: string
          name_ps?: string | null
          name_ur: string
          region?: string | null
          slug: string
        }
        Update: {
          id?: string
          is_ardc?: boolean | null
          lat?: number
          lng?: number
          name_en?: string
          name_ps?: string | null
          name_ur?: string
          region?: string | null
          slug?: string
        }
        Relationships: []
      }
      emergency_requests: {
        Row: {
          created_at: string
          description: string
          district_id: string | null
          emergency_type: string
          full_name: string
          id: string
          is_test: boolean
          language: string
          location: string
          people_affected: number
          phone: string
          request_code: string
          status: string
          tehsil: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          district_id?: string | null
          emergency_type: string
          full_name: string
          id?: string
          is_test?: boolean
          language?: string
          location: string
          people_affected: number
          phone: string
          request_code: string
          status?: string
          tehsil: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          district_id?: string | null
          emergency_type?: string
          full_name?: string
          id?: string
          is_test?: boolean
          language?: string
          location?: string
          people_affected?: number
          phone?: string
          request_code?: string
          status?: string
          tehsil?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "emergency_requests_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
        ]
      }
      monitoring_runs: {
        Row: {
          districts_failed: number
          districts_ok: number
          error_text: string | null
          finished_at: string | null
          http_status: Json
          id: string
          started_at: string
          status: string
          trigger_source: string
        }
        Insert: {
          districts_failed?: number
          districts_ok?: number
          error_text?: string | null
          finished_at?: string | null
          http_status?: Json
          id?: string
          started_at?: string
          status?: string
          trigger_source?: string
        }
        Update: {
          districts_failed?: number
          districts_ok?: number
          error_text?: string | null
          finished_at?: string | null
          http_status?: Json
          id?: string
          started_at?: string
          status?: string
          trigger_source?: string
        }
        Relationships: []
      }
      monitoring_snapshots: {
        Row: {
          district: string
          district_id: string | null
          fetched_at: string
          id: string
          metrics: Json
        }
        Insert: {
          district: string
          district_id?: string | null
          fetched_at?: string
          id?: string
          metrics?: Json
        }
        Update: {
          district?: string
          district_id?: string | null
          fetched_at?: string
          id?: string
          metrics?: Json
        }
        Relationships: [
          {
            foreignKeyName: "monitoring_snapshot_district_ref"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
        ]
      }
      service_health: {
        Row: {
          last_error_at: string | null
          last_error_text: string | null
          last_success_at: string | null
          service: string
        }
        Insert: {
          last_error_at?: string | null
          last_error_text?: string | null
          last_success_at?: string | null
          service: string
        }
        Update: {
          last_error_at?: string | null
          last_error_text?: string | null
          last_success_at?: string | null
          service?: string
        }
        Relationships: []
      }
      submission_rate_limits: {
        Row: {
          created_at: string
          id: string
          ip_hash: string
        }
        Insert: {
          created_at?: string
          id?: string
          ip_hash: string
        }
        Update: {
          created_at?: string
          id?: string
          ip_hash?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
    }
    Enums: {
      app_role: "admin" | "coordinator" | "user"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "coordinator", "user"],
    },
  },
} as const
