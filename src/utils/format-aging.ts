export function formatAging(fromIso: string | null | undefined, toIso?: string | null): string {
  if (!fromIso) return '—';

  const from = new Date(fromIso).getTime();
  const to = toIso ? new Date(toIso).getTime() : Date.now();
  const diffMs = Math.max(0, to - from);

  const minutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m`;
  return '<1m';
}

export type AgingLevel = 'normal' | 'warning' | 'overdue';

const WARNING_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 1 day
const OVERDUE_THRESHOLD_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

// How long an application has been sitting is only actionable if it's easy to
// spot — this turns the raw duration into a stoplight level so stale
// applications stand out instead of blending into every other aging badge.
export function getAgingLevel(fromIso: string | null | undefined, toIso?: string | null): AgingLevel {
  if (!fromIso) return 'normal';

  const from = new Date(fromIso).getTime();
  const to = toIso ? new Date(toIso).getTime() : Date.now();
  const diffMs = Math.max(0, to - from);

  if (diffMs >= OVERDUE_THRESHOLD_MS) return 'overdue';
  if (diffMs >= WARNING_THRESHOLD_MS) return 'warning';
  return 'normal';
}

export const AGING_LEVEL_COLORS: Record<AgingLevel, { text: string; icon: string }> = {
  normal: { text: '#667085', icon: '#8891A6' },
  warning: { text: '#B36A05', icon: '#B36A05' },
  overdue: { text: '#B32C22', icon: '#B32C22' },
};
