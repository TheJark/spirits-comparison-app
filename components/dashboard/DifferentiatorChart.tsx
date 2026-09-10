'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { DifferentiatorEntry } from '@/lib/differentiators';
import { colorForSegment } from '@/lib/segmentPalette';
import { useIsNarrow } from '@/lib/useIsNarrow';

interface TargetMeta {
  key: string;
  name: string;
}

function truncate(s: string, n: number) {
  if (s.length <= n) return s;
  const cut = s.slice(0, n - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${lastSpace > n * 0.6 ? cut.slice(0, lastSpace) : cut}…`;
}

// Two-line Y-axis tick: the attribute value in bold, the parent attribute
// (and optionally its group) muted underneath -- recharts clones this with
// x/y/payload at render time, so dataById/showGroup ride along as extra
// props on the element we hand to <YAxis tick={...} />.
function AttributeTick(props: any) {
  const { x, y, payload, dataById, showGroup, labelChars, subChars } = props;
  const row = dataById.get(payload.value);
  if (!row) return null;
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={-8} y={-3} textAnchor="end" fontSize={11} fontWeight={600} fill="var(--text-primary)">
        {truncate(row.label, labelChars)}
      </text>
      <text x={-8} y={10} textAnchor="end" fontSize={10} fill="var(--text-muted)">
        {truncate(showGroup ? `${row.sub} · ${row.group_label}` : row.sub, subChars)}
      </text>
    </g>
  );
}

function DiffTooltip({ active, payload, targets, showGroup }: any) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="rc-tooltip">
      <div className="rc-tooltip-title">{row.label}</div>
      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 6 }}>
        {row.sub}{showGroup ? ` · ${row.group_label}` : ''}
      </div>
      <div className="rc-tooltip-row">
        <span className="swatch" style={{ background: 'var(--series-baseline)' }} />
        Baseline: {row.baseline_pct}%
      </div>
      {targets.map((t: TargetMeta) => {
        const gap = row[t.key];
        const pct = row[`${t.key}_pct`];
        if (gap == null) return null;
        return (
          <div key={t.key} className="rc-tooltip-row">
            <span className="swatch" style={{ background: colorForSegment(t.key, 'target').light }} />
            {t.name}: {pct}% ({gap > 0 ? '+' : ''}{gap} pts)
          </div>
        );
      })}
    </div>
  );
}

export default function DifferentiatorChart({
  entries,
  targets,
  showGroupLabel = false,
}: {
  entries: DifferentiatorEntry[];
  targets: TargetMeta[];
  showGroupLabel?: boolean;
}) {
  const isNarrow = useIsNarrow();

  if (entries.length === 0 || targets.length === 0) {
    return <div className="empty-state">No overlapping attributes met the sample-size threshold yet.</div>;
  }

  const maxAbs = Math.max(2, ...entries.map((e) => e.maxAbsGap));
  const bound = Math.ceil(maxAbs + 2);
  const labelWidth = isNarrow ? 130 : 260;
  const labelChars = isNarrow ? 16 : 32;
  const subChars = isNarrow ? 20 : 44;

  const data = entries.map((e) => {
    const row: Record<string, string | number | null> = {
      id: e.id,
      label: e.value_label,
      sub: e.attribute_label,
      group_label: e.group_label,
      baseline_pct: e.baseline_pct,
    };
    targets.forEach((t) => {
      row[t.key] = e.targets[t.key]?.gap ?? null;
      row[`${t.key}_pct`] = e.targets[t.key]?.pct ?? null;
    });
    return row;
  });

  const dataById = new Map(data.map((d) => [d.id, d]));
  const height = Math.max(160, data.length * 46 + 30);

  return (
    <div>
      <div className="chart-legend">
        <span className="legend-item">
          <span className="legend-swatch" style={{ background: 'var(--series-baseline)' }} />
          Baseline (reference)
        </span>
        {targets.map((t) => (
          <span key={t.key} className="legend-item">
            <span className="legend-swatch" style={{ background: colorForSegment(t.key, 'target').light }} />
            {t.name}
          </span>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ left: 8, right: 28, top: 4, bottom: 4 }}
          barCategoryGap="26%"
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--gridline)" horizontal={false} />
          <XAxis
            type="number"
            domain={[-bound, bound]}
            unit=" pts"
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            axisLine={{ stroke: 'var(--baseline-axis)' }}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="id"
            width={labelWidth}
            tick={<AttributeTick dataById={dataById} showGroup={showGroupLabel} labelChars={labelChars} subChars={subChars} />}
            axisLine={{ stroke: 'var(--baseline-axis)' }}
            tickLine={false}
          />
          <Tooltip
            content={<DiffTooltip targets={targets} showGroup={showGroupLabel} />}
            cursor={{ fill: 'var(--gridline)', opacity: 0.4 }}
          />
          <ReferenceLine x={0} stroke="var(--baseline-axis)" />
          {targets.map((t) => (
            <Bar
              key={t.key}
              dataKey={t.key}
              name={t.name}
              fill={colorForSegment(t.key, 'target').light}
              radius={2}
              maxBarSize={13}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
