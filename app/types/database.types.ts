export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      jobs: {
        Row: {
          id: string
          title: string
          company: string
          url: string | null
          description: string | null
          status: 'new' | 'reviewing' | 'applied' | 'interviewing' | 'offer' | 'rejected' | 'archived'
          fit_score: number | null
          salary_min: number | null
          salary_max: number | null
          location: string | null
          remote: boolean
          source: string | null
          external_id: string | null
          notes: string | null
          applied_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          company: string
          url?: string | null
          description?: string | null
          status?: 'new' | 'reviewing' | 'applied' | 'interviewing' | 'offer' | 'rejected' | 'archived'
          fit_score?: number | null
          salary_min?: number | null
          salary_max?: number | null
          location?: string | null
          remote?: boolean
          source?: string | null
          external_id?: string | null
          notes?: string | null
          applied_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['jobs']['Insert']>
      }
      profile: {
        Row: {
          id: string
          name: string
          email: string | null
          title: string | null
          skills: string[]
          experience_years: number | null
          preferred_roles: string[]
          preferred_locations: string[]
          min_salary: number | null
          cv_url: string | null
          linkedin_url: string | null
          github_url: string | null
          bio: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['profile']['Row'], 'id' | 'created_at' | 'updated_at'> & { id?: string }
        Update: Partial<Database['public']['Tables']['profile']['Insert']>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      job_status: 'new' | 'reviewing' | 'applied' | 'interviewing' | 'offer' | 'rejected' | 'archived'
    }
  }
}
