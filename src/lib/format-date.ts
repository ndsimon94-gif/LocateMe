export function formatDateRange(startIso: string, endIso: string): string {
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const start = new Date(`${startIso}T00:00:00`).toLocaleDateString('en-US', opts);
  const end = new Date(`${endIso}T00:00:00`).toLocaleDateString('en-US', opts);
  return `${start} – ${end}`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
