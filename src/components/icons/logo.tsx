export function YeBetWegLogo({
  className = "w-8 h-8",
  showText = false
}: {
  className?: string
  showText?: boolean
}) {
  return (
    <div className={`flex items-center gap-2 ${showText ? '' : ''}`}>
      <svg
        viewBox="0 0 200 200"
        className={className}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Outer circle */}
        <circle
          cx="100"
          cy="100"
          r="95"
          stroke="currentColor"
          strokeWidth="8"
          strokeOpacity="0.9"
        />

        {/* Hammer head */}
        <rect
          x="65"
          y="45"
          width="45"
          height="35"
          rx="4"
          fill="currentColor"
        />

        {/* Hammer handle */}
        <rect
          x="82"
          y="75"
          width="12"
          height="65"
          rx="6"
          fill="currentColor"
        />

        {/* Axe head */}
        <path
          d="M 135 50 L 155 70 L 135 90 Q 130 80 135 50"
          fill="currentColor"
        />

        {/* Axe handle */}
        <line
          x1="135"
          y1="90"
          x2="155"
          y2="140"
          stroke="currentColor"
          strokeWidth="10"
          strokeLinecap="round"
        />
      </svg>

      {showText && (
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-bold text-current">YeBetWeg</span>
          <span className="text-[10px] text-current opacity-70">የቤት-ወግ</span>
        </div>
      )}
    </div>
  )
}

export function YeBetWegLogomark({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outer circle */}
      <circle
        cx="100"
        cy="100"
        r="95"
        stroke="currentColor"
        strokeWidth="8"
        strokeOpacity="0.9"
      />

      {/* Hammer head */}
      <rect
        x="65"
        y="45"
        width="45"
        height="35"
        rx="4"
        fill="currentColor"
      />

      {/* Hammer handle */}
      <rect
        x="82"
        y="75"
        width="12"
        height="65"
        rx="6"
        fill="currentColor"
      />

      {/* Axe head */}
      <path
        d="M 135 50 L 155 70 L 135 90 Q 130 80 135 50"
        fill="currentColor"
      />

      {/* Axe handle */}
      <line
        x1="135"
        y1="90"
        x2="155"
        y2="140"
        stroke="currentColor"
        strokeWidth="10"
        strokeLinecap="round"
      />
    </svg>
  )
}
