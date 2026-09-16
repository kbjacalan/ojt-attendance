export default function NotificationBadge({ count = 0, show, max = 9 }) {
  const shouldShow = show ?? count > 0;
  if (!shouldShow) return null;

  const display = count > max ? `${max}+` : count;

  return (
    <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold leading-none">
      {count > 0 ? display : null}
    </span>
  );
}
