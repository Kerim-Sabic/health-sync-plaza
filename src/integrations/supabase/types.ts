export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      body_metrics: {
        Row: {
          body_fat: number | null;
          id: string;
          log_date: string;
          user_id: string;
          weight: number | null;
        };
        Insert: {
          body_fat?: number | null;
          id?: string;
          log_date?: string;
          user_id?: string;
          weight?: number | null;
        };
        Update: {
          body_fat?: number | null;
          id?: string;
          log_date?: string;
          user_id?: string;
          weight?: number | null;
        };
        Relationships: [];
      };
      check_ins: {
        Row: {
          adherence: number | null;
          client_id: string;
          coach_reply: string | null;
          created_at: string;
          energy: number | null;
          id: string;
          questions: string | null;
          replied_at: string | null;
          sleep: number | null;
          stress: number | null;
          struggles: string | null;
          week_start: string;
          weight: number | null;
          wins: string | null;
        };
        Insert: {
          adherence?: number | null;
          client_id?: string;
          coach_reply?: string | null;
          created_at?: string;
          energy?: number | null;
          id?: string;
          questions?: string | null;
          replied_at?: string | null;
          sleep?: number | null;
          stress?: number | null;
          struggles?: string | null;
          week_start: string;
          weight?: number | null;
          wins?: string | null;
        };
        Update: {
          adherence?: number | null;
          client_id?: string;
          coach_reply?: string | null;
          created_at?: string;
          energy?: number | null;
          id?: string;
          questions?: string | null;
          replied_at?: string | null;
          sleep?: number | null;
          stress?: number | null;
          struggles?: string | null;
          week_start?: string;
          weight?: number | null;
          wins?: string | null;
        };
        Relationships: [];
      };
      journal_entries: {
        Row: {
          body: string | null;
          created_at: string;
          energy: number;
          id: string;
          mood: number;
          user_id: string;
        };
        Insert: {
          body?: string | null;
          created_at?: string;
          energy?: number;
          id?: string;
          mood?: number;
          user_id?: string;
        };
        Update: {
          body?: string | null;
          created_at?: string;
          energy?: number;
          id?: string;
          mood?: number;
          user_id?: string;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          body: string;
          client_id: string;
          created_at: string;
          id: string;
          sender_id: string;
          trainer_id: string;
        };
        Insert: {
          body: string;
          client_id: string;
          created_at?: string;
          id?: string;
          sender_id?: string;
          trainer_id: string;
        };
        Update: {
          body?: string;
          client_id?: string;
          created_at?: string;
          id?: string;
          sender_id?: string;
          trainer_id?: string;
        };
        Relationships: [];
      };
      nutrition_logs: {
        Row: {
          calories: number;
          carbs: number;
          fat: number;
          id: string;
          log_date: string;
          meal: string;
          name: string;
          protein: number;
          user_id: string;
        };
        Insert: {
          calories?: number;
          carbs?: number;
          fat?: number;
          id?: string;
          log_date?: string;
          meal?: string;
          name: string;
          protein?: number;
          user_id?: string;
        };
        Update: {
          calories?: number;
          carbs?: number;
          fat?: number;
          id?: string;
          log_date?: string;
          meal?: string;
          name?: string;
          protein?: number;
          user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_path: string | null;
          bio: string | null;
          created_at: string;
          display_name: string | null;
          goal: string | null;
          id: string;
          trainer_code: string | null;
        };
        Insert: {
          avatar_path?: string | null;
          bio?: string | null;
          created_at?: string;
          display_name?: string | null;
          goal?: string | null;
          id: string;
          trainer_code?: string | null;
        };
        Update: {
          avatar_path?: string | null;
          bio?: string | null;
          created_at?: string;
          display_name?: string | null;
          goal?: string | null;
          id?: string;
          trainer_code?: string | null;
        };
        Relationships: [];
      };
      program_assignments: {
        Row: {
          client_id: string;
          created_at: string;
          id: string;
          program_id: string;
          start_date: string;
          trainer_id: string;
        };
        Insert: {
          client_id: string;
          created_at?: string;
          id?: string;
          program_id: string;
          start_date?: string;
          trainer_id?: string;
        };
        Update: {
          client_id?: string;
          created_at?: string;
          id?: string;
          program_id?: string;
          start_date?: string;
          trainer_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "program_assignments_program_id_fkey";
            columns: ["program_id"];
            isOneToOne: false;
            referencedRelation: "programs";
            referencedColumns: ["id"];
          },
        ];
      };
      programs: {
        Row: {
          created_at: string;
          days: Json;
          description: string | null;
          id: string;
          name: string;
          trainer_id: string;
          weeks: number;
        };
        Insert: {
          created_at?: string;
          days?: Json;
          description?: string | null;
          id?: string;
          name: string;
          trainer_id?: string;
          weeks?: number;
        };
        Update: {
          created_at?: string;
          days?: Json;
          description?: string | null;
          id?: string;
          name?: string;
          trainer_id?: string;
          weeks?: number;
        };
        Relationships: [];
      };
      progress_photos: {
        Row: {
          created_at: string;
          id: string;
          note: string | null;
          pose: string;
          storage_path: string;
          taken_on: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          note?: string | null;
          pose?: string;
          storage_path: string;
          taken_on?: string;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          note?: string | null;
          pose?: string;
          storage_path?: string;
          taken_on?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      progress_reports: {
        Row: {
          client_id: string;
          comment: string | null;
          created_at: string;
          id: string;
          period_days: number;
          summary: Json;
          trainer_id: string;
        };
        Insert: {
          client_id: string;
          comment?: string | null;
          created_at?: string;
          id?: string;
          period_days?: number;
          summary?: Json;
          trainer_id?: string;
        };
        Update: {
          client_id?: string;
          comment?: string | null;
          created_at?: string;
          id?: string;
          period_days?: number;
          summary?: Json;
          trainer_id?: string;
        };
        Relationships: [];
      };
      sleep_logs: {
        Row: {
          hours: number;
          id: string;
          log_date: string;
          quality: number;
          user_id: string;
        };
        Insert: {
          hours: number;
          id?: string;
          log_date?: string;
          quality?: number;
          user_id?: string;
        };
        Update: {
          hours?: number;
          id?: string;
          log_date?: string;
          quality?: number;
          user_id?: string;
        };
        Relationships: [];
      };
      trainer_clients: {
        Row: {
          client_id: string;
          created_at: string;
          id: string;
          trainer_id: string;
        };
        Insert: {
          client_id: string;
          created_at?: string;
          id?: string;
          trainer_id: string;
        };
        Update: {
          client_id?: string;
          created_at?: string;
          id?: string;
          trainer_id?: string;
        };
        Relationships: [];
      };
      trainer_notes: {
        Row: {
          body: string;
          client_id: string;
          created_at: string;
          from_client: boolean;
          id: string;
          shared: boolean;
          trainer_id: string;
        };
        Insert: {
          body: string;
          client_id: string;
          created_at?: string;
          from_client?: boolean;
          id?: string;
          shared?: boolean;
          trainer_id?: string;
        };
        Update: {
          body?: string;
          client_id?: string;
          created_at?: string;
          from_client?: boolean;
          id?: string;
          shared?: boolean;
          trainer_id?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
      workouts: {
        Row: {
          duration_min: number | null;
          id: string;
          notes: string | null;
          performed_at: string;
          rpe: number | null;
          sets: Json;
          title: string;
          user_id: string;
        };
        Insert: {
          duration_min?: number | null;
          id?: string;
          notes?: string | null;
          performed_at?: string;
          rpe?: number | null;
          sets?: Json;
          title: string;
          user_id?: string;
        };
        Update: {
          duration_min?: number | null;
          id?: string;
          notes?: string | null;
          performed_at?: string;
          rpe?: number | null;
          sets?: Json;
          title?: string;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      find_trainer_by_code: {
        Args: { _code: string };
        Returns: {
          display_name: string;
          id: string;
        }[];
      };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      is_trainer_of: { Args: { _client: string }; Returns: boolean };
    };
    Enums: {
      app_role: "solo" | "client" | "trainer";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["solo", "client", "trainer"],
    },
  },
} as const;
