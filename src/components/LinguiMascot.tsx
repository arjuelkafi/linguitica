import React from 'react';

interface MascotProps {
  mood?: 'happy' | 'cheering' | 'thinking' | 'encouraging' | 'celebrating';
  muted?: boolean;
  className?: string;
  size?: number;
}

export const LinguiMascot: React.FC<MascotProps> = ({
  mood = 'happy',
  muted = false,
  className = '',
  size = 120,
}) => {
  // Flat solid palette (no gradients), switches to muted gray for upcoming/locked sections
  const oceanFill = muted ? '#CBD5E1' : '#38BDF8';
  const oceanStroke = muted ? '#94A3B8' : '#0284C7';
  const landFill = muted ? '#94A3B8' : '#58CC02';
  const meridianStroke = muted ? '#E2E8F0' : '#7DD3FC';
  const armFill = muted ? '#94A3B8' : '#0EA5E9';
  const shoeFill = muted ? '#94A3B8' : '#F97316';
  const shoeStroke = muted ? '#64748B' : '#C2410C';
  const cheekFill = muted ? '#E2E8F0' : '#FCA5A5';
  const eyeStroke = muted ? '#64748B' : '#0369A1';
  const pupilFill = muted ? '#475569' : '#0F172A';

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 160 160"
        width={size}
        height={size}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* Flat ground shadow */}
        <ellipse cx="80" cy="148" rx="40" ry="6" fill="#E2E8F0" />

        {/* Little cute boots/feet */}
        <rect
          x="52"
          y="130"
          width="20"
          height="14"
          rx="7"
          fill={shoeFill}
          stroke={shoeStroke}
          strokeWidth="3"
        />
        <rect
          x="88"
          y="130"
          width="20"
          height="14"
          rx="7"
          fill={shoeFill}
          stroke={shoeStroke}
          strokeWidth="3"
        />

        {/* Globe Body */}
        <circle
          cx="80"
          cy="82"
          r="52"
          fill={oceanFill}
          stroke={oceanStroke}
          strokeWidth="4"
        />

        {/* Latitude and longitude arcs clipped visually inside globe */}
        <path
          d="M32 82H128"
          stroke={meridianStroke}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M40 54C56 60 104 60 120 54"
          stroke={meridianStroke}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M40 110C56 104 104 104 120 110"
          stroke={meridianStroke}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <ellipse
          cx="80"
          cy="82"
          rx="26"
          ry="50"
          stroke={meridianStroke}
          strokeWidth="2.5"
        />

        {/* Continents (Green land masses, flat solid shapes) */}
        <path
          d="M44 48C54 40 68 42 70 50C72 58 60 66 56 76C52 84 40 82 36 72C33 62 36 54 44 48Z"
          fill={landFill}
        />
        <path
          d="M94 42C106 42 118 52 120 64C122 76 112 84 104 82C96 80 96 68 90 60C84 52 86 42 94 42Z"
          fill={landFill}
        />
        <path
          d="M52 104C62 98 76 102 82 110C88 118 82 128 70 128C58 128 46 114 52 104Z"
          fill={landFill}
        />
        <path
          d="M102 98C110 96 118 104 114 114C110 122 98 122 96 114C94 106 96 100 102 98Z"
          fill={landFill}
        />

        {/* Top little explorer leaf sprout */}
        <path
          d="M80 30C80 20 88 14 96 16C94 24 88 30 80 30Z"
          fill={landFill}
          stroke={oceanStroke}
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <path
          d="M80 30C80 22 72 18 66 20C68 26 74 30 80 30Z"
          fill={landFill}
          stroke={oceanStroke}
          strokeWidth="2.5"
          strokeLinejoin="round"
        />

        {/* Expressive Duolingo-style Big Eyes */}
        <circle cx="62" cy="76" r="14" fill="#FFFFFF" stroke={eyeStroke} strokeWidth="3" />
        <circle
          cx={mood === 'thinking' ? 58 : mood === 'cheering' ? 63 : 64}
          cy={mood === 'thinking' ? 72 : 76}
          r="6.5"
          fill={pupilFill}
        />
        <circle cx="66" cy="73" r="2.5" fill="#FFFFFF" />

        <circle cx="98" cy="76" r="14" fill="#FFFFFF" stroke={eyeStroke} strokeWidth="3" />
        <circle
          cx={mood === 'thinking' ? 94 : mood === 'cheering' ? 99 : 100}
          cy={mood === 'thinking' ? 72 : 76}
          r="6.5"
          fill={pupilFill}
        />
        <circle cx="102" cy="73" r="2.5" fill="#FFFFFF" />

        {/* Rosy Cheeks */}
        <ellipse cx="45" cy="90" rx="5.5" ry="3.5" fill={cheekFill} />
        <ellipse cx="115" cy="90" rx="5.5" ry="3.5" fill={cheekFill} />

        {/* Friendly Mouth */}
        {mood === 'cheering' || mood === 'celebrating' ? (
          <path
            d="M70 94C70 103 90 103 90 94H70Z"
            fill="#F97316"
            stroke="#0F172A"
            strokeWidth="2.8"
            strokeLinejoin="round"
          />
        ) : mood === 'thinking' ? (
          <path
            d="M74 98H86"
            stroke="#0F172A"
            strokeWidth="3.2"
            strokeLinecap="round"
          />
        ) : (
          <path
            d="M70 94C74 101 86 101 90 94"
            stroke="#0F172A"
            strokeWidth="3.2"
            strokeLinecap="round"
          />
        )}

        {/* Expressive Cartoon Arms */}
        {mood === 'cheering' || mood === 'celebrating' ? (
          <>
            <path
              d="M30 78C18 64 16 50 22 46C28 44 33 58 34 72"
              fill={armFill}
              stroke={oceanStroke}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M130 78C142 64 144 50 138 46C132 44 127 58 126 72"
              fill={armFill}
              stroke={oceanStroke}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        ) : mood === 'thinking' ? (
          <>
            <path
              d="M29 88C20 96 22 108 32 112"
              fill="none"
              stroke={oceanStroke}
              strokeWidth="5"
              strokeLinecap="round"
            />
            <path
              d="M128 90C120 98 102 98 92 98"
              fill="none"
              stroke={oceanStroke}
              strokeWidth="5"
              strokeLinecap="round"
            />
          </>
        ) : (
          <>
            <path
              d="M29 86C20 94 20 106 31 112"
              fill="none"
              stroke={oceanStroke}
              strokeWidth="5"
              strokeLinecap="round"
            />
            <path
              d="M131 86C140 94 140 106 129 112"
              fill="none"
              stroke={oceanStroke}
              strokeWidth="5"
              strokeLinecap="round"
            />
          </>
        )}

        {/* Celebration stars (flat solid shapes) */}
        {(mood === 'celebrating' || mood === 'cheering') && !muted && (
          <>
            <path
              d="M22 28L25 34L31 35L26 39L27 45L22 42L17 45L18 39L13 35L19 34L22 28Z"
              fill="#FFC800"
            />
            <path
              d="M138 28L141 34L147 35L142 39L143 45L138 42L133 45L134 39L129 35L135 34L138 28Z"
              fill="#FFC800"
            />
          </>
        )}
      </svg>
    </div>
  );
};
