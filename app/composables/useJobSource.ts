// Single source of truth for human-readable job-source labels, shared across
// the board (jobs/index.vue) and the quick-view panel (JobPeek.vue).
export const SOURCE_LABELS: Record<string, string> = {
  remotive: 'Remotive',
  arbeitnow: 'Arbeitnow',
  habr: 'Habr Career',
  hh: 'HH.ru',
  rabota: 'rabota.by',
  djinni: 'Djinni',
  linkedin: 'LinkedIn',
  unknown: 'Other',
}

/** Map a source id (or null/undefined) to its display label, falling back to the raw id. */
export function sourceLabel(s: string | null | undefined): string {
  if (!s) return 'Other'
  return SOURCE_LABELS[s] ?? s
}
