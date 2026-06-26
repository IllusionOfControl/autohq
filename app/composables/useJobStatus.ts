export type JobStatus =
  | 'new'
  | 'reviewing'
  | 'applied'
  | 'interviewing'
  | 'offer'
  | 'rejected'
  | 'archived'
  | 'dismissed'

interface StatusMeta {
  label: string
  icon: string
  /** small dot color */
  dot: string
  /** pill/badge: bg + text + border */
  badge: string
  /** active filter chip */
  chip: string
  /** kanban column header accent (left border + text) */
  accent: string
}

/** Single source of truth for everything status-related. */
export const JOB_STATUS: Record<JobStatus, StatusMeta> = {
  new: {
    label: 'New',
    icon: 'lucide:sparkles',
    dot: 'bg-blue-400',
    badge: 'bg-blue-500/10 text-blue-300 border-blue-500/25',
    chip: 'bg-blue-500/15 border-blue-500/60 text-blue-300',
    accent: 'before:bg-blue-500 text-blue-300',
  },
  reviewing: {
    label: 'Reviewing',
    icon: 'lucide:eye',
    dot: 'bg-amber-400',
    badge: 'bg-amber-500/10 text-amber-300 border-amber-500/25',
    chip: 'bg-amber-500/15 border-amber-500/60 text-amber-300',
    accent: 'before:bg-amber-500 text-amber-300',
  },
  applied: {
    label: 'Applied',
    icon: 'lucide:send',
    dot: 'bg-violet-400',
    badge: 'bg-violet-500/10 text-violet-300 border-violet-500/25',
    chip: 'bg-violet-500/15 border-violet-500/60 text-violet-300',
    accent: 'before:bg-violet-500 text-violet-300',
  },
  interviewing: {
    label: 'Interview',
    icon: 'lucide:messages-square',
    dot: 'bg-orange-400',
    badge: 'bg-orange-500/10 text-orange-300 border-orange-500/25',
    chip: 'bg-orange-500/15 border-orange-500/60 text-orange-300',
    accent: 'before:bg-orange-500 text-orange-300',
  },
  offer: {
    label: 'Offer',
    icon: 'lucide:party-popper',
    dot: 'bg-emerald-400',
    badge: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25',
    chip: 'bg-emerald-500/15 border-emerald-500/60 text-emerald-300',
    accent: 'before:bg-emerald-500 text-emerald-300',
  },
  rejected: {
    label: 'Rejected',
    icon: 'lucide:x',
    dot: 'bg-rose-400',
    badge: 'bg-rose-500/10 text-rose-300 border-rose-500/25',
    chip: 'bg-rose-500/15 border-rose-500/60 text-rose-300',
    accent: 'before:bg-rose-500 text-rose-300',
  },
  archived: {
    label: 'Archived',
    icon: 'lucide:archive',
    dot: 'bg-zinc-500',
    badge: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/25',
    chip: 'bg-zinc-500/15 border-zinc-500/60 text-zinc-300',
    accent: 'before:bg-zinc-500 text-zinc-400',
  },
  dismissed: {
    label: 'Won\'t apply',
    icon: 'lucide:ban',
    dot: 'bg-zinc-500',
    badge: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/25',
    chip: 'bg-zinc-500/15 border-zinc-500/60 text-zinc-300',
    accent: 'before:bg-zinc-500 text-zinc-400',
  },
}

/** Pipeline order (left → right), excludes archived. */
export const PIPELINE: JobStatus[] = [
  'new',
  'reviewing',
  'applied',
  'interviewing',
  'offer',
  'dismissed',
  'rejected',
]

/** Columns shown on the kanban board. */
export const BOARD_COLUMNS: JobStatus[] = [
  'new',
  'reviewing',
  'applied',
  'interviewing',
  'offer',
  'rejected',
  'dismissed'
]

/** Statuses that count as an "application". */
export const APPLIED_STATUSES: JobStatus[] = ['applied', 'interviewing', 'offer']

/** Tailwind text color for a fit score. */
export function scoreColor(score: number | null | undefined): string {
  if (score == null) return 'text-muted-foreground'
  if (score >= 70) return 'text-emerald-400'
  if (score >= 40) return 'text-amber-400'
  return 'text-rose-400/80'
}

/** Tailwind classes for the circular score ring background (conic). */
export function scoreRingColor(score: number | null | undefined): string {
  if (score == null) return 'oklch(0.685 0.013 265)'
  if (score >= 70) return 'oklch(0.7 0.16 160)'
  if (score >= 40) return 'oklch(0.76 0.16 75)'
  return 'oklch(0.63 0.21 23)'
}
