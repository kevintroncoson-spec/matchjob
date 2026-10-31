interface MatchRingProps {
  score: number
  size?: number
  strokeWidth?: number
}

export function MatchRing({ score, size = 48, strokeWidth = 4 }: MatchRingProps) {
  const radius = (size - strokeWidth * 2) / 2
  const circumference = 2 * Math.PI * radius
  const dash = (score / 100) * circumference

  const color = score >= 80 ? '#1D9E75' : score >= 60 ? '#185FA5' : '#BA7517'

  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }} aria-label={`Match ${score}%`}>
      {/* Track */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#e8f0f8"
        strokeWidth={strokeWidth}
      />
      {/* Progress */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={`${dash.toFixed(1)} ${circumference.toFixed(1)}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dasharray 0.8s ease' }}
      />
      {/* Label */}
      <text
        x={size / 2}
        y={size / 2 + 4}
        textAnchor="middle"
        fontSize={size < 40 ? 9 : 11}
        fontWeight="700"
        fill={color}
        style={{ fontFamily: 'Syne, sans-serif' }}
      >
        {score}%
      </text>
    </svg>
  )
}
