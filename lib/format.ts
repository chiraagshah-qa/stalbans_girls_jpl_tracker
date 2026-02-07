/** Format a timestamp for "Last updated" display (e.g. "31st January 2026 at 14:30"). */
export function formatLastUpdated(ms: number): string {
  const d = new Date(ms);
  const day = d.getDate();
  const month = d.toLocaleString('en-GB', { month: 'long' });
  const year = d.getFullYear();
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  const suffix = day === 1 || day === 21 || day === 31 ? 'st' : day === 2 || day === 22 ? 'nd' : day === 3 || day === 23 ? 'rd' : 'th';
  return `${day}${suffix} ${month} ${year} at ${time}`;
}
