export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}
