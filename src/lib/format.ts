// Display helpers

export function shortAddr(a: string, lead = 6, tail = 4): string {
  if (!a) return '';
  return `${a.slice(0, lead)}…${a.slice(-tail)}`;
}

export function fmtUSDC(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

export function timeLeft(deadlineMs: number): string {
  const diff = deadlineMs - Date.now();
  if (diff <= 0) return 'Expired';
  const sec = Math.floor(diff / 1000);
  const days = Math.floor(sec / 86400);
  const hrs = Math.floor((sec % 86400) / 3600);
  const mins = Math.floor((sec % 3600) / 60);
  if (days > 0) return `${days}d ${hrs}h`;
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
}

export function fmtDeadline(deadlineMs: number): string {
  const d = new Date(deadlineMs);
  return d.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function fmtTimeUntil(ms: number): string {
  const diff = ms - Date.now();
  if (diff <= 0) return 'Closed';
  const sec = Math.floor(diff / 1000);
  const days = Math.floor(sec / 86400);
  const hrs = Math.floor((sec % 86400) / 3600);
  const mins = Math.floor((sec % 3600) / 60);
  if (days > 0) return `${days}d ${hrs}h`;
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
}

export function fmtRelative(ms: number): string {
  const diff = Date.now() - ms;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `just now`;
  const mins = Math.floor(sec / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}
