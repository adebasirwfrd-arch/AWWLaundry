export function BrandLogo({ className = 'h-12 w-12' }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="aww-rainbow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF5C9A" />
          <stop offset="17%" stopColor="#FF8C2A" />
          <stop offset="33%" stopColor="#FFD23F" />
          <stop offset="50%" stopColor="#6BCB77" />
          <stop offset="67%" stopColor="#4ECDC4" />
          <stop offset="83%" stopColor="#4A90D9" />
          <stop offset="100%" stopColor="#9B59B6" />
        </linearGradient>
        <radialGradient id="bubble-glow" cx="30%" cy="30%" r="70%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.95)" />
          <stop offset="100%" stopColor="rgba(78,205,196,0.5)" />
        </radialGradient>
      </defs>
      <circle cx="60" cy="60" r="56" fill="url(#bubble-glow)" opacity="0.9" />
      <circle cx="60" cy="60" r="56" stroke="url(#aww-rainbow)" strokeWidth="3" fill="none" />
      <path
        d="M38 72 C38 52 48 42 60 42 C72 42 82 52 82 68 C82 82 72 88 60 88 C48 88 38 82 38 72Z"
        fill="url(#aww-rainbow)"
        opacity="0.85"
      />
      <ellipse cx="52" cy="58" rx="5" ry="7" fill="white" opacity="0.9" />
      <ellipse cx="68" cy="58" rx="5" ry="7" fill="white" opacity="0.9" />
      <circle cx="54" cy="60" r="2.5" fill="#1E3A6E" />
      <circle cx="70" cy="60" r="2.5" fill="#1E3A6E" />
      <path
        d="M52 74 Q60 80 68 74"
        stroke="#1E3A6E"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="28" cy="35" r="8" fill="url(#aww-rainbow)" opacity="0.4" />
      <circle cx="92" cy="40" r="6" fill="url(#aww-rainbow)" opacity="0.35" />
      <circle cx="85" cy="85" r="10" fill="url(#aww-rainbow)" opacity="0.3" />
    </svg>
  );
}
