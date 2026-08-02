// Hand-maintained to mirror `supabase/migrations`. If a real Supabase
// project is ever linked, prefer regenerating instead:
//   npx supabase gen types typescript --local > src/types/database.ts
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string | null;
          display_name: string | null;
          location_sharing_default: 'off' | 'country' | 'city';
          current_country_code: string | null;
          current_city_id: string | null;
          location_updated_at: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          username?: string | null;
          display_name?: string | null;
          location_sharing_default?: 'off' | 'country' | 'city';
          current_country_code?: string | null;
          current_city_id?: string | null;
          location_updated_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          username?: string | null;
          display_name?: string | null;
          location_sharing_default?: 'off' | 'country' | 'city';
          current_country_code?: string | null;
          current_city_id?: string | null;
          location_updated_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      countries: {
        Row: {
          code: string;
          name: string;
          lat: number;
          lng: number;
          emoji: string | null;
        };
        Insert: {
          code: string;
          name: string;
          lat: number;
          lng: number;
          emoji?: string | null;
        };
        Update: {
          code?: string;
          name?: string;
          lat?: number;
          lng?: number;
          emoji?: string | null;
        };
        Relationships: [];
      };
      cities: {
        Row: {
          id: string;
          country_code: string;
          name: string;
          lat: number;
          lng: number;
        };
        Insert: {
          id?: string;
          country_code: string;
          name: string;
          lat: number;
          lng: number;
        };
        Update: {
          id?: string;
          country_code?: string;
          name?: string;
          lat?: number;
          lng?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'cities_country_code_fkey';
            columns: ['country_code'];
            referencedRelation: 'countries';
            referencedColumns: ['code'];
          },
        ];
      };
      connect_codes: {
        Row: {
          id: string;
          user_id: string;
          token: string;
          created_at: string;
          expires_at: string;
          used_by: string | null;
          used_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          token?: string;
          created_at?: string;
          expires_at?: string;
          used_by?: string | null;
          used_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          token?: string;
          created_at?: string;
          expires_at?: string;
          used_by?: string | null;
          used_at?: string | null;
        };
        Relationships: [];
      };
      friendships: {
        Row: {
          id: string;
          user_id_a: string;
          user_id_b: string;
          connected_country_code: string | null;
          connected_city_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id_a: string;
          user_id_b: string;
          connected_country_code?: string | null;
          connected_city_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id_a?: string;
          user_id_b?: string;
          connected_country_code?: string | null;
          connected_city_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      friendship_settings: {
        Row: {
          friendship_id: string;
          owner_id: string;
          sharing_level: 'default' | 'off' | 'country' | 'city';
        };
        Insert: {
          friendship_id: string;
          owner_id: string;
          sharing_level?: 'default' | 'off' | 'country' | 'city';
        };
        Update: {
          friendship_id?: string;
          owner_id?: string;
          sharing_level?: 'default' | 'off' | 'country' | 'city';
        };
        Relationships: [];
      };
      conversations: {
        Row: {
          id: string;
          friendship_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          friendship_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          friendship_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          body: string;
          created_at: string;
          read_at: string | null;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_id: string;
          body: string;
          created_at?: string;
          read_at?: string | null;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          sender_id?: string;
          body?: string;
          created_at?: string;
          read_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      redeem_connect_code: {
        Args: { p_token: string };
        Returns: {
          friendship_id: string;
          friend_id: string;
          friend_username: string | null;
          friend_display_name: string | null;
          already_connected: boolean;
        }[];
      };
    };
    Enums: Record<string, never>;
  };
};
