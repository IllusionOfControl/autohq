/**
 * Canonical shape of a row in the `jobs` table, shared between the server API
 * (postgres query result types) and the client (inferred through $fetch).
 *
 * Date columns are typed as `string` because that's what the client receives
 * after Nitro serializes the response — even though postgres hands the server a
 * JS `Date` at runtime.
 */
export type JobStatus =
  | 'new'
  | 'reviewing'
  | 'applied'
  | 'interviewing'
  | 'offer'
  | 'rejected'
  | 'archived'

export interface Job {
  id: string
  title: string
  company: string
  url: string | null
  location: string | null
  remote: boolean
  status: JobStatus
  fit_score: number | null
  salary_min: number | null
  salary_max: number | null
  notes: string | null
  description: string | null
  cover_letter: string | null
  score_reason: string | null
  source: string | null
  external_id: string | null
  applied_at: string | null
  created_at: string
}

/** Columns returned by the list endpoint (GET /api/jobs). */
export type JobListItem = Pick<
  Job,
  | 'id'
  | 'title'
  | 'company'
  | 'location'
  | 'remote'
  | 'status'
  | 'fit_score'
  | 'salary_min'
  | 'salary_max'
  | 'created_at'
  | 'applied_at'
  | 'url'
  | 'source'
>
