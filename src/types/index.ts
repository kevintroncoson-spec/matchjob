// ─── Database types (espejo del esquema Supabase) ─────────────────────────────

export type UserType = 'candidate' | 'company'
export type ApplicationStatus = 'new' | 'viewed' | 'saved' | 'rejected'
export type WorkModality = 'remote' | 'hybrid' | 'onsite' | 'flexible'

export interface Profile {
  id: string
  user_id: string
  name: string
  role: string | null
  location: string | null
  avatar_url: string | null
  bio: string | null
  type: UserType
  // Campos candidato (onboarding)
  salary_min: number | null
  salary_max: number | null
  modality: WorkModality | null
  max_commute_minutes: number | null
  availability_days: number | null   // días para comenzar
  expected_benefits: string[]        // jsonb
  skills: string[]                   // jsonb
  created_at: string
}

export interface Job {
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
  // Join
  company?: Pick<Profile, 'id' | 'name' | 'avatar_url' | 'location'>
}

export interface Application {
  id: string
  job_id: string
  candidate_id: string
  status: ApplicationStatus
  created_at: string
  // Joins
  job?: Job
  candidate?: Profile
}

export interface Alert {
  id: string
  user_id: string
  tags: string[]
  active: boolean
  created_at: string
}

// ─── API request/response types ───────────────────────────────────────────────

export interface FeedResponse {
  jobs: Job[]
  cursor: string | null
  hasMore: boolean
}

export interface MatchAnalysis {
  score: number
  summary: string
  strengths: string[]
  gaps: string[]
}

export interface OnboardingData {
  salary: string
  modality: WorkModality
  maxCommuteMinutes: number
  availabilityDays: number
  benefits: string[]
}

// ─── UI state types ────────────────────────────────────────────────────────────

export interface ToastState {
  message: string
  icon: string
  visible: boolean
}

export interface DashboardStats {
  total: number
  new: number
  viewed: number
  saved: number
}
