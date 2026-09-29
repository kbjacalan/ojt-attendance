export function greetingFor(now = new Date()) {
  const raw = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    hour: "numeric",
    hour12: false,
  }).format(now);
  let hour = parseInt(raw, 10);
  if (hour === 24) hour = 0;
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}
