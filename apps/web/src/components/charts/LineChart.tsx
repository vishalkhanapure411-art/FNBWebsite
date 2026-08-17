'use client';
interface LinePoint {
  label: string;
  value: number;
}
export interface OverlaySeries {
  /** Points rendered in the same index-based x-space as `data`. */
  points: LinePoint[];
  /** Index in the shared x-axis space where this series starts (e.g. after the history). */
  startIndex: number;
  color?: string;
  dashed?: boolean;
}
interface LineChartProps {
  data: LinePoint[];
  height?: number;
  formatValue?: (value: number) => string;
  className?: string;
  color?: string;
  showArea?: boolean;
  /** Optional secondary series (e.g. dashed forecast) sharing the same x-scale. */
  overlay?: OverlaySeries[];
}
/**
 * Dependency-free SVG line/area chart used for time series (revenue trend).
 * Renders a responsive polyline with an optional gradient area fill.
 * `overlay` renders additional series (typically the dashed forecast) on the
 * same index-based x-axis — startIndex lets a forecast begin where the
 * historical series ends.
 */
export function LineChart({
  data,
  height = 220,
  formatValue = (v) => v.toString(),
  className = '',
  color = '#e63946',
  showArea = true,
  overlay = [],
}: LineChartProps) {
  if (!data.length) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ height }}>
        <p className="text-surface-400 text-sm">No data available</p>
      </div>
    );
  }
  const width = 800; // viewBox units; scales to container
  const paddingX = 8;
  const paddingY = 16;
  const overlayValues = overlay.flatMap((s) => s.points.map((p) => p.value));
  const max = Math.max(...data.map((d) => d.value), ...overlayValues, 1);
  const stepX = data.length > 1 ? (width - paddingX * 2) / (data.length - 1) : 0;
  const points = data.map((d, i) => {
    const x = paddingX + i * stepX;
    const y = paddingY + (1 - d.value / max) * (height - paddingY * 2);
    return { x, y, ...d };
  });
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPath = showArea
    ? `${linePath} L${(points[points.length - 1]?.x ?? paddingX).toFixed(1)},${height - paddingY} L${paddingX},${height - paddingY} Z`
    : '';
  const gradId = 'linechart-area-fill';
  const overlayPaths = overlay.map((s, si) => {
    const overlayPoints = s.points.map((d, i) => {
      const x = paddingX + (s.startIndex + i) * stepX;
      const y = paddingY + (1 - d.value / max) * (height - paddingY * 2);
      return { x, y, ...d };
    });
    const path = overlayPoints
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
      .join(' ');
    return { points: overlayPoints, path, series: s, si };
  });
  return (
    <div className={className}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        style={{ height }}
        preserveAspectRatio="none"
        role="img"
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {showArea && <path d={areaPath} fill={`url(#${gradId})`} />}
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="3.5" fill={color} className="opacity-80" />
            <title>{`${p.label}: ${formatValue(p.value)}`}</title>
          </g>
        ))}
        {overlayPaths.map(({ points: overlayPoints, path, series, si }) => (
          <g key={si}>
            <path
              d={path}
              fill="none"
              stroke={series.color ?? '#3b82f6'}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={series.dashed ? '7 5' : undefined}
            />
            {overlayPoints.map((p, i) => (
              <g key={i}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="3"
                  fill={series.color ?? '#3b82f6'}
                  className="opacity-90"
                />
                <title>{`${p.label}: ${formatValue(p.value)}`}</title>
              </g>
            ))}
          </g>
        ))}
      </svg>
      {/* X-axis labels — first, middle, last */}
      <div className="flex justify-between text-[10px] text-surface-500 mt-1">
        <span>{points[0]?.label}</span>
        <span>{points[Math.floor(points.length / 2)]?.label}</span>
        <span>{points[points.length - 1]?.label}</span>
      </div>
    </div>
  );
}
