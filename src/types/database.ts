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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
