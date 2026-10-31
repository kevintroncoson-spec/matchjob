// Generado manualmente reflejando las migraciones 001 + 002.
// Para regenerar desde Supabase:
// npx supabase gen types typescript --project-id YOUR_ID > src/lib/supabase/database.types.ts

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type ProfileType = 'candidate' | 'company' | 'admin'
export type ProfileStatus = 'pending' | 'approved' | 'rejected' | 'suspended'

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          user_id: string
          name: string
          role: string | null
          location: string | null
          avatar_url: string | null
          bio: string | null
          type: ProfileType
          status: ProfileStatus
          phone: string | null
          salary_min: number | null
          salary_max: number | null
          modality: string | null
          max_commute_minutes: number | null
          availability_days: number | null
          expected_benefits: string[]
          skills: string[]
          company_rut: string | null
          company_website: string | null
          company_size: string | null
          company_industry: string | null
          contact_email: string | null
          contact_phone: string | null
          rejection_reason: string | null
          approved_at: string | null
          approved_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['profiles']['Row']> & { user_id: string; name: string }
        Update: Partial<Database['public']['Tables']['profiles']['Row']>
      }
      jobs: {
        Row: {
          id: string
          company_id: string
          title: string
          description: string
          tags: string[]
          benefits: string[]
          location: string
          type: string
          salary_min: number | null
          salary_max: number | null
          active: boolean
          views: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['jobs']['Row'], 'id' | 'created_at' | 'views'>
        Update: Partial<Database['public']['Tables']['jobs']['Insert']>
      }
      applications: {
        Row: {
          id: string
          job_id: string
          candidate_id: string
          status: 'new' | 'viewed' | 'saved' | 'rejected'
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['applications']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['applications']['Insert']>
      }
      alerts: {
        Row: {
          id: string
          user_id: string
          tags: string[]
          active: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['alerts']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['alerts']['Insert']>
      }
      work_experience: {
        Row: {
          id: string
          profile_id: string
          company_name: string
          role: string
          start_date: string | null
          end_date: string | null
          is_current: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['work_experience']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['work_experience']['Insert']>
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: 'viewed' | 'saved' | 'rejected' | 'message' | 'new_job' | 'system'
          title: string
          body: string | null
          company_name: string | null
          job_title: string | null
          read: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['notifications']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>
      }
      messages: {
        Row: {
          id: string
          from_profile: string
          to_profile: string
          job_id: string | null
          body: string
          read: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['messages']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['messages']['Insert']>
      }
      audit_log: {
        Row: {
          id: string
          actor_id: string | null
          action: string
          target_type: string | null
          target_id: string | null
          detail: Json | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['audit_log']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['audit_log']['Insert']>
      }
    }
    Views: {
      admin_stats: {
        Row: {
          total_candidates: number
          total_companies: number
          pending_companies: number
          approved_companies: number
          active_jobs: number
          total_applications: number
          applications_last_week: number
          new_candidates_last_week: number
        }
      }
    }
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean }
      approve_company: { Args: { company_profile_id: string }; Returns: undefined }
      set_company_status: { Args: { company_profile_id: string; new_status: string; reason?: string }; Returns: undefined }
      increment_job_views: { Args: { job_id: string }; Returns: undefined }
    }
  }
}
