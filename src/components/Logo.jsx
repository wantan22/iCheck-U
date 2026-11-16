// iCheck-U mark: a check inside a circle ("no one left unchecked").
// `inverse` draws a black tile with a yellow mark, for use on coloured status bars.
export default function Logo({ className = 'h-10 w-10', inverse = false }) {
  const tile = inverse ? '#141414' : '#FFC107';
  const mark = inverse ? '#FFC107' : '#141414';
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true" focusable="false">
      <rect width="64" height="64" rx="16" fill={tile} />
      <circle cx="32" cy="32" r="19" fill="none" stroke={mark} strokeWidth="5.5" />
      <path d="M22.5 32.5l6.5 6.5 13-14" fill="none" stroke={mark} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
