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
          whatsapp_number: string | null;
          social_handle: string | null;
          contact_message: string | null;
          home_country_code: string | null;
          home_city_id: string | null;
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
          whatsapp_number?: string | null;
          social_handle?: string | null;
          contact_message?: string | null;
          home_country_code?: string | null;
          home_city_id?: string | null;
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
          whatsapp_number?: string | null;
          social_handle?: string | null;
          contact_message?: string | null;
          home_country_code?: string | null;
          home_city_id?: string | null;
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
          met_place: string | null;
          met_story: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id_a: string;
          user_id_b: string;
          connected_country_code?: string | null;
          connected_city_id?: string | null;
          met_place?: string | null;
          met_story?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id_a?: string;
          user_id_b?: string;
          connected_country_code?: string | null;
          connected_city_id?: string | null;
          met_place?: string | null;
          met_story?: string | null;
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
      friend_notes: {
        Row: {
          friendship_id: string;
          owner_id: string;
          body: string;
          updated_at: string;
        };
        Insert: {
          friendship_id: string;
          owner_id: string;
          body?: string;
          updated_at?: string;
        };
        Update: {
          friendship_id?: string;
          owner_id?: string;
          body?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      tags: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          name?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      friend_tags: {
        Row: {
          friendship_id: string;
          tag_id: string;
        };
        Insert: {
          friendship_id: string;
          tag_id: string;
        };
        Update: {
          friendship_id?: string;
          tag_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'friend_tags_tag_id_fkey';
            columns: ['tag_id'];
            referencedRelation: 'tags';
            referencedColumns: ['id'];
          },
        ];
      };
      friendship_photos: {
        Row: {
          id: string;
          friendship_id: string;
          uploaded_by: string;
          storage_path: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          friendship_id: string;
          uploaded_by: string;
          storage_path: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          friendship_id?: string;
          uploaded_by?: string;
          storage_path?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      trip_itineraries: {
        Row: {
          id: string;
          owner_id: string;
          title: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          title?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          title?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      trip_stops: {
        Row: {
          id: string;
          itinerary_id: string;
          city_id: string;
          country_code: string;
          start_date: string;
          end_date: string;
        };
        Insert: {
          id?: string;
          itinerary_id: string;
          city_id: string;
          country_code: string;
          start_date: string;
          end_date: string;
        };
        Update: {
          id?: string;
          itinerary_id?: string;
          city_id?: string;
          country_code?: string;
          start_date?: string;
          end_date?: string;
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
      get_friends_with_location: {
        Args: Record<string, never>;
        Returns: {
          friendship_id: string;
          friend_id: string;
          username: string | null;
          display_name: string | null;
          sharing_level: 'off' | 'country' | 'city';
          country_code: string | null;
          country_name: string | null;
          country_lat: number | null;
          country_lng: number | null;
          city_id: string | null;
          city_name: string | null;
          city_lat: number | null;
          city_lng: number | null;
          whatsapp_number: string | null;
          social_handle: string | null;
          contact_message: string | null;
          home_country_code: string | null;
          home_country_name: string | null;
          home_city_id: string | null;
          home_city_name: string | null;
        }[];
      };
      get_my_itineraries_with_connections: {
        Args: Record<string, never>;
        Returns: {
          itinerary_id: string;
          title: string | null;
          stop_id: string;
          city_id: string;
          city_name: string;
          country_code: string;
          country_name: string;
          start_date: string;
          end_date: string;
          connections: { name: string; reason: 'currently there' | 'lives there' | 'visiting then' }[];
        }[];
      };
      get_friendship_history: {
        Args: Record<string, never>;
        Returns: {
          friendship_id: string;
          friend_id: string;
          username: string | null;
          display_name: string | null;
          connected_country_name: string | null;
          connected_city_name: string | null;
          connected_city_lat: number | null;
          connected_city_lng: number | null;
          connected_country_lat: number | null;
          connected_country_lng: number | null;
          met_place: string | null;
          met_story: string | null;
          created_at: string;
        }[];
      };
    };
    Enums: Record<string, never>;
  };
};
