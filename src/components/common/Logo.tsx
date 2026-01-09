export default function Logo() {
  return (
    <svg
      width="90"
      height="50"
      viewBox="0 0 90 50"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Controller shape */}
      <rect
        x="4"
        y="15"
        width="82"
        height="20"
        rx="5"
        fill="url(#logoGradient)"
      />
        <text
          x="45"
          y="25"
          fontFamily="Arial Narrow, Arial, sans-serif"
          fontSize="10"
          fontWeight="bold"
          fill="black"
          textAnchor="middle"
          dominantBaseline="middle"
        >
          MyHomeGames
        </text>
      {/* Gradient definition */}
      <defs>
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#E5A00D" />
          <stop offset="100%" stopColor="#F5B041" />
        </linearGradient>
      </defs>
    </svg>
  );
}
