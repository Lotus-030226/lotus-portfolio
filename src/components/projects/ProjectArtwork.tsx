export default function ProjectArtwork({
  index,
  label,
}: {
  index: number;
  label: string;
}) {
  const colors = ['#74e2cb', '#ac9afb', '#81baff', '#e5b881', '#d0e788'];
  const color = colors[index % colors.length];
  return (
    <div
      className="project-art"
      style={{ '--art-color': color } as React.CSSProperties}
      aria-hidden="true"
    >
      <svg viewBox="0 0 640 380" fill="none">
        <defs>
          <radialGradient id={`halo-${index}`}>
            <stop stopColor={color} stopOpacity=".18" />
            <stop offset="1" stopColor={color} stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse
          cx="320"
          cy="200"
          rx="260"
          ry="170"
          fill={`url(#halo-${index})`}
        />
        <g
          stroke={color}
          strokeOpacity=".6"
          transform={`translate(320 190) rotate(${index * 13 - 15})`}
        >
          <ellipse rx="155" ry="105" />
          <ellipse rx="155" ry="55" />
          <ellipse rx="75" ry="105" />
          <ellipse rx="30" ry="105" />
          <path d="M-180 0h360 M0-130v260" strokeOpacity=".3" />
          {Array.from({ length: 6 }, (_, i) => (
            <g key={i} transform={`rotate(${i * 60})`}>
              <path d="M0-75V-145" />
              <circle cy="-145" r="5" fill={color} />
            </g>
          ))}
        </g>
        <rect
          x="236"
          y="166"
          width="168"
          height="48"
          rx="9"
          fill="#10181a"
          stroke={color}
          strokeOpacity=".8"
        />
        <text
          x="320"
          y="195"
          textAnchor="middle"
          fill={color}
          fontFamily="monospace"
          fontSize="14"
        >
          {label}
        </text>
      </svg>
      <div className="art-coordinates">
        <span>LOTUS / {String(index + 1).padStart(2, '0')}</span>
        <span>↗</span>
      </div>
    </div>
  );
}
