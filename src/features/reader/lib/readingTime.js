export function formatReadingTime(minutes) {
  const safeMinutes = Math.max(1, Math.round(Number(minutes) || 0));
  if (safeMinutes < 60) return `${safeMinutes} min`;

  const hours = Math.floor(safeMinutes / 60);
  const remainingMinutes = safeMinutes % 60;
  if (!remainingMinutes) return `${hours} hr`;
  return `${hours} hr ${remainingMinutes} min`;
}
