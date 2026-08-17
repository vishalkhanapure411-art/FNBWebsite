'use client';

interface BarData {
  label: string;
  value: number;
  color?: string;
  secondaryValue?: number;
  secondaryLabel?: string;
}

interface BarChartProps {
  data: BarData[];
  height?: number;
  showLabels?: boolean;
  maxValue?: number;
  formatValue?: (value: number) => string;
  className?: string;
}

const DEFAULT_COLORS = [
  'bg-brand-500',
  'bg-emerald-500',
  'bg-blue-500',
  'bg-purple-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-cyan-500',
  'bg-indigo-500',
];

export function BarChart({
  data,
  height = 200,
  showLabels = true,
  maxValue,
  formatValue = (v) => v.toString(),
  className = '',
}: BarChartProps) {
  if (!data.length) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ height }}>
        <p className="text-surface-400 text-sm">No data available</p>
      </div>
    );
  }

  const computedMax = maxValue ?? Math.max(...data.map((d) => d.value), 1);

  return (
    <div className={className}>
      <div className="flex items-end gap-1" style={{ height }}>
        {data.map((item, i) => {
          const barHeight = (item.value / computedMax) * height;
          const color = item.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length];

          return (
            <div
              key={i}
              className="flex-1 flex flex-col items-center justify-end min-w-0"
              title={`${item.label}: ${formatValue(item.value)}`}
            >
              <div
                className={`w-full max-w-[40px] rounded-t-sm ${color} transition-all duration-300 hover:opacity-80`}
                style={{ height: `${Math.max(barHeight, 2)}px` }}
              />
              {showLabels && (
                <span className="text-[10px] text-surface-500 mt-1 truncate w-full text-center leading-tight">
                  {item.label.length > 6 ? item.label.slice(0, 5) + '…' : item.label}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface HorizontalBarChartProps {
  data: BarData[];
  height?: number;
  showValues?: boolean;
  formatValue?: (value: number) => string;
  className?: string;
}

export function HorizontalBarChart({
  data,
  height = 300,
  showValues = true,
  formatValue = (v) => v.toString(),
  className = '',
}: HorizontalBarChartProps) {
  if (!data.length) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ height }}>
        <p className="text-surface-400 text-sm">No data available</p>
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className={`space-y-2 ${className}`}>
      {data.map((item, i) => {
        const widthPercent = (item.value / maxValue) * 100;
        const color = item.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length];

        return (
          <div key={i} className="flex items-center gap-2">
            <span className="text-xs text-surface-600 dark:text-surface-400 w-20 truncate text-right">
              {item.label}
            </span>
            <div className="flex-1 h-5 bg-surface-100 dark:bg-surface-700 rounded-sm overflow-hidden">
              <div
                className={`h-full rounded-sm ${color} transition-all duration-300`}
                style={{ width: `${widthPercent}%` }}
              />
            </div>
            {showValues && (
              <span className="text-xs font-medium text-surface-700 dark:text-surface-300 w-16">
                {formatValue(item.value)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
