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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      breaks: {
        Row: {
          break_type: string
          created_at: string
          end_time: string | null
          id: string
          is_paid: boolean
          start_time: string
          time_entry_id: string
          user_id: string
        }
        Insert: {
          break_type: string
          created_at?: string
          end_time?: string | null
          id?: string
          is_paid?: boolean
          start_time: string
          time_entry_id: string
          user_id: string
        }
        Update: {
          break_type?: string
          created_at?: string
          end_time?: string | null
          id?: string
          is_paid?: boolean
          start_time?: string
          time_entry_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "breaks_time_entry_id_fkey"
            columns: ["time_entry_id"]
            isOneToOne: false
            referencedRelation: "time_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      drive_entries: {
        Row: {
          created_at: string
          end_location: Json | null
          end_time: string | null
          id: string
          kilometers: number | null
          project_id: string
          route_data: Json | null
          start_location: Json | null
          start_time: string
          user_id: string
          user_name: string
        }
        Insert: {
          created_at?: string
          end_location?: Json | null
          end_time?: string | null
          id?: string
          kilometers?: number | null
          project_id: string
          route_data?: Json | null
          start_location?: Json | null
          start_time: string
          user_id: string
          user_name: string
        }
        Update: {
          created_at?: string
          end_location?: Json | null
          end_time?: string | null
          id?: string
          kilometers?: number | null
          project_id?: string
          route_data?: Json | null
          start_location?: Json | null
          start_time?: string
          user_id?: string
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "drive_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drive_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_secure_member_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drive_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      favorite_addresses: {
        Row: {
          address: string
          category: string | null
          created_at: string | null
          icon: string | null
          id: string
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          address: string
          category?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          address?: string
          category?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      goal_lists: {
        Row: {
          created_at: string
          id: string
          name: string
          order_index: number
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          order_index?: number
          type?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          order_index?: number
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      goal_tasks: {
        Row: {
          completed_at: string | null
          created_at: string
          deadline: string | null
          id: string
          is_completed: boolean
          list_id: string
          name: string
          points: number
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          deadline?: string | null
          id?: string
          is_completed?: boolean
          list_id: string
          name: string
          points?: number
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          deadline?: string | null
          id?: string
          is_completed?: boolean
          list_id?: string
          name?: string
          points?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "goal_tasks_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "goal_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      materials: {
        Row: {
          created_at: string
          id: string
          name: string
          project_id: string
          quantity: number
          total_price: number
          unit_price: number
          user_id: string
          user_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          project_id: string
          quantity: number
          total_price: number
          unit_price: number
          user_id: string
          user_name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          project_id?: string
          quantity?: number
          total_price?: number
          unit_price?: number
          user_id?: string
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "materials_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "materials_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_secure_member_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "materials_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string | null
          daily_summary_enabled: boolean | null
          daily_summary_time: string | null
          email_enabled: boolean | null
          project_activity_enabled: boolean | null
          push_enabled: boolean | null
          timer_reminder_enabled: boolean | null
          timer_reminder_hours: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          daily_summary_enabled?: boolean | null
          daily_summary_time?: string | null
          email_enabled?: boolean | null
          project_activity_enabled?: boolean | null
          push_enabled?: boolean | null
          timer_reminder_enabled?: boolean | null
          timer_reminder_hours?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          daily_summary_enabled?: boolean | null
          daily_summary_time?: string | null
          email_enabled?: boolean | null
          project_activity_enabled?: boolean | null
          push_enabled?: boolean | null
          timer_reminder_enabled?: boolean | null
          timer_reminder_hours?: number | null
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_url: string | null
          created_at: string | null
          id: string
          message: string | null
          metadata: Json | null
          read: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          created_at?: string | null
          id?: string
          message?: string | null
          metadata?: Json | null
          read?: boolean | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          created_at?: string | null
          id?: string
          message?: string | null
          metadata?: Json | null
          read?: boolean | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      organizations: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          organization_name: string
          organization_number: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          organization_name: string
          organization_number: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          organization_name?: string
          organization_number?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          app_mode: string
          color_theme: string | null
          created_at: string
          default_breakfast_min: number | null
          default_breakfast_time: string | null
          default_end_time: string | null
          default_lunch_min: number | null
          default_lunch_time: string | null
          default_start_time: string | null
          hourly_rate_nok: number | null
          id: string
          name: string
          normal_hours_per_day: number | null
          normal_hours_per_week: number | null
          organization_name: string | null
          organization_number: string | null
          show_activity_log: boolean
          show_cost_calculator: boolean
          show_notes: boolean
          show_project_actions: boolean
          show_team_invite: boolean
          show_weather_notifications: boolean
          show_weather_widget: boolean
          tax_method: string | null
          tax_percentage: number | null
          weather_location: string | null
        }
        Insert: {
          app_mode?: string
          color_theme?: string | null
          created_at?: string
          default_breakfast_min?: number | null
          default_breakfast_time?: string | null
          default_end_time?: string | null
          default_lunch_min?: number | null
          default_lunch_time?: string | null
          default_start_time?: string | null
          hourly_rate_nok?: number | null
          id: string
          name: string
          normal_hours_per_day?: number | null
          normal_hours_per_week?: number | null
          organization_name?: string | null
          organization_number?: string | null
          show_activity_log?: boolean
          show_cost_calculator?: boolean
          show_notes?: boolean
          show_project_actions?: boolean
          show_team_invite?: boolean
          show_weather_notifications?: boolean
          show_weather_widget?: boolean
          tax_method?: string | null
          tax_percentage?: number | null
          weather_location?: string | null
        }
        Update: {
          app_mode?: string
          color_theme?: string | null
          created_at?: string
          default_breakfast_min?: number | null
          default_breakfast_time?: string | null
          default_end_time?: string | null
          default_lunch_min?: number | null
          default_lunch_time?: string | null
          default_start_time?: string | null
          hourly_rate_nok?: number | null
          id?: string
          name?: string
          normal_hours_per_day?: number | null
          normal_hours_per_week?: number | null
          organization_name?: string | null
          organization_number?: string | null
          show_activity_log?: boolean
          show_cost_calculator?: boolean
          show_notes?: boolean
          show_project_actions?: boolean
          show_team_invite?: boolean
          show_weather_notifications?: boolean
          show_weather_widget?: boolean
          tax_method?: string | null
          tax_percentage?: number | null
          weather_location?: string | null
        }
        Relationships: []
      }
      project_invites: {
        Row: {
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          invite_code: string
          max_uses: number | null
          project_id: string
          use_count: number
        }
        Insert: {
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          invite_code: string
          max_uses?: number | null
          project_id: string
          use_count?: number
        }
        Update: {
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          invite_code?: string
          max_uses?: number | null
          project_id?: string
          use_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_invites_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_invites_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_secure_member_view"
            referencedColumns: ["id"]
          },
        ]
      }
      project_members: {
        Row: {
          id: string
          joined_at: string
          project_id: string
          role: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          project_id: string
          role: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          project_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_secure_member_view"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          color: string
          completed: boolean
          contract_number: string | null
          created_at: string
          created_by: string
          customer_address: string | null
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          description: string | null
          hide_customer_info: boolean
          id: string
          name: string
          organization_id: string | null
        }
        Insert: {
          color: string
          completed?: boolean
          contract_number?: string | null
          created_at?: string
          created_by: string
          customer_address?: string | null
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          description?: string | null
          hide_customer_info?: boolean
          id?: string
          name: string
          organization_id?: string | null
        }
        Update: {
          color?: string
          completed?: boolean
          contract_number?: string | null
          created_at?: string
          created_by?: string
          customer_address?: string | null
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          description?: string | null
          hide_customer_info?: boolean
          id?: string
          name?: string
          organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      time_entries: {
        Row: {
          comment: string | null
          comp_method: string | null
          created_at: string
          duration_seconds: number
          end_time: string | null
          id: string
          is_manual: boolean
          is_overtime: boolean | null
          overtime_rate: number | null
          paused_at: string | null
          project_id: string
          start_time: string
          user_id: string
          user_name: string
        }
        Insert: {
          comment?: string | null
          comp_method?: string | null
          created_at?: string
          duration_seconds?: number
          end_time?: string | null
          id?: string
          is_manual?: boolean
          is_overtime?: boolean | null
          overtime_rate?: number | null
          paused_at?: string | null
          project_id: string
          start_time: string
          user_id: string
          user_name: string
        }
        Update: {
          comment?: string | null
          comp_method?: string | null
          created_at?: string
          duration_seconds?: number
          end_time?: string | null
          id?: string
          is_manual?: boolean
          is_overtime?: boolean | null
          overtime_rate?: number | null
          paused_at?: string | null
          project_id?: string
          start_time?: string
          user_id?: string
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_secure_member_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      time_entry_pauses: {
        Row: {
          created_at: string | null
          id: string
          pause_type: string | null
          paused_at: string
          resumed_at: string | null
          time_entry_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          pause_type?: string | null
          paused_at: string
          resumed_at?: string | null
          time_entry_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          pause_type?: string | null
          paused_at?: string
          resumed_at?: string | null
          time_entry_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_entry_pauses_time_entry_id_fkey"
            columns: ["time_entry_id"]
            isOneToOne: false
            referencedRelation: "time_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      user_fcm_tokens: {
        Row: {
          created_at: string | null
          fcm_token: string | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          fcm_token?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          fcm_token?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_organizations: {
        Row: {
          id: string
          joined_at: string
          organization_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          organization_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          organization_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_organizations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
      user_streaks: {
        Row: {
          created_at: string | null
          current_streak: number | null
          last_activity_date: string | null
          longest_streak: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_streak?: number | null
          last_activity_date?: string | null
          longest_streak?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_streak?: number | null
          last_activity_date?: string | null
          longest_streak?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      wage_settings: {
        Row: {
          created_at: string
          default_lunch_minutes: number
          hourly_rate: number
          id: string
          lunch_is_paid: boolean
          overtime_multiplier: number
          overtime_threshold: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          default_lunch_minutes?: number
          hourly_rate?: number
          id?: string
          lunch_is_paid?: boolean
          overtime_multiplier?: number
          overtime_threshold?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          default_lunch_minutes?: number
          hourly_rate?: number
          id?: string
          lunch_is_paid?: boolean
          overtime_multiplier?: number
          overtime_threshold?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      weather_notifications: {
        Row: {
          created_at: string | null
          date: string
          id: string
          notified: boolean | null
          precipitation: number | null
          temperature: number | null
          user_id: string
          weather_type: string
          wind_speed: number | null
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          notified?: boolean | null
          precipitation?: number | null
          temperature?: number | null
          user_id: string
          weather_type: string
          wind_speed?: number | null
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          notified?: boolean | null
          precipitation?: number | null
          temperature?: number | null
          user_id?: string
          weather_type?: string
          wind_speed?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      projects_secure_member_view: {
        Row: {
          color: string | null
          completed: boolean | null
          contract_number: string | null
          created_at: string | null
          created_by: string | null
          customer_address: string | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          description: string | null
          hide_customer_info: boolean | null
          id: string | null
          name: string | null
          organization_id: string | null
        }
        Insert: {
          color?: string | null
          completed?: boolean | null
          contract_number?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_address?: never
          customer_email?: never
          customer_name?: string | null
          customer_phone?: never
          description?: string | null
          hide_customer_info?: boolean | null
          id?: string | null
          name?: string | null
          organization_id?: string | null
        }
        Update: {
          color?: string | null
          completed?: boolean | null
          contract_number?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_address?: never
          customer_email?: never
          customer_name?: string | null
          customer_phone?: never
          description?: string | null
          hide_customer_info?: boolean | null
          id?: string | null
          name?: string | null
          organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      can_access_customer_data: {
        Args: { _project_id: string }
        Returns: boolean
      }
      can_access_project_sensitive_data:
        | { Args: { project_created_by: string }; Returns: boolean }
        | {
            Args: { project_created_by: string; project_org_id: string }
            Returns: boolean
          }
      create_project:
        | {
            Args: {
              p_color: string
              p_contract_number: string
              p_customer_address: string
              p_customer_email: string
              p_customer_name: string
              p_customer_phone: string
              p_description: string
              p_name: string
            }
            Returns: {
              color: string
              completed: boolean
              contract_number: string | null
              created_at: string
              created_by: string
              customer_address: string | null
              customer_email: string | null
              customer_name: string
              customer_phone: string | null
              description: string | null
              hide_customer_info: boolean
              id: string
              name: string
              organization_id: string | null
            }
            SetofOptions: {
              from: "*"
              to: "projects"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: {
              p_color: string
              p_contract_number: string
              p_customer_address: string
              p_customer_email: string
              p_customer_name: string
              p_customer_phone: string
              p_description: string
              p_hide_customer_info?: boolean
              p_name: string
            }
            Returns: {
              color: string
              completed: boolean
              contract_number: string | null
              created_at: string
              created_by: string
              customer_address: string | null
              customer_email: string | null
              customer_name: string
              customer_phone: string | null
              description: string | null
              hide_customer_info: boolean
              id: string
              name: string
              organization_id: string | null
            }
            SetofOptions: {
              from: "*"
              to: "projects"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      get_user_organization: { Args: { user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_project_member: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
      is_project_owner: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
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
