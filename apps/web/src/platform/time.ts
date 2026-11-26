/** Human friendly relative time, localized through i18n keys. */
export function relativeTimeKey(isoDate: string | null): {
  key: string;
  params?: Record<string, number>;
} {
  if (!isoDate) return { key: 'timeAgo.never' };
  const then = new Date(isoDate).getTime();
  if (Number.isNaN(then)) return { key: 'timeAgo.never' };
  const diffMs = Date.now() - then;
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return { key: 'timeAgo.justNow' };
  if (minutes < 60) return { key: 'timeAgo.minutes', params: { count: minutes } };
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return { key: 'timeAgo.hours', params: { count: hours } };
  const days = Math.floor(hours / 24);
  return { key: 'timeAgo.days', params: { count: days } };
}
