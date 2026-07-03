export function Sparkline({
  series,
  dropStart,
  dropEnd,
  height = 190,
}: {
  series: [number, number][];
  dropStart: number | null;
  dropEnd: number | null;
  height?: number;
}) {
  if (!series.length) return null;
  const W = 1200,
    H = height,
    P = 6;
  const t0 = series[0][0],
    t1 = series[series.length - 1][0];
  const max = Math.max(...series.map((s) => s[1]));
  const x = (t: number) => P + ((t - t0) / (t1 - t0)) * (W - 2 * P);
  const y = (v: number) => H - P - (v / max) * (H - 2 * P);
  const path = series.map((s, i) => `${i ? "L" : "M"}${x(s[0]).toFixed(1)},${y(s[1]).toFixed(1)}`).join("");
  const area = `${path}L${x(t1).toFixed(1)},${H - P}L${x(t0).toFixed(1)},${H - P}Z`;
  const athIdx = series.reduce((bi, s, i) => (s[1] > series[bi][1] ? i : bi), 0);
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height={H}
      preserveAspectRatio="none"
      role="img"
      aria-label="ANSEM price history since launch"
    >
      <defs>
        <linearGradient id="sparkfill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(75,233,111,0.24)" />
          <stop offset="100%" stopColor="rgba(75,233,111,0)" />
        </linearGradient>
      </defs>
      {dropStart && dropEnd && (
        <rect
          x={x(dropStart)}
          y={0}
          width={Math.max(3, x(dropEnd) - x(dropStart))}
          height={H}
          fill="rgba(91,141,239,0.09)"
        />
      )}
      <path d={area} fill="url(#sparkfill)" />
      <path d={path} fill="none" stroke="#4BE96F" strokeWidth="2" strokeLinejoin="round" />
      <circle cx={x(series[athIdx][0])} cy={y(series[athIdx][1])} r="3.5" fill="#4BE96F" />
    </svg>
  );
}
