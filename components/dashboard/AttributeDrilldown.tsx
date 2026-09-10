'use client';

import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { MIN_SAMPLE, ProfileRow } from '@/lib/profileTypes';
import { colorForSegment } from '@/lib/segmentPalette';
import { useIsNarrow } from '@/lib/useIsNarrow';

interface TargetMeta {
  key: string;
  name: string;
}

function DrilldownTooltip({ active, payload, label, baselineName, targets }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rc-tooltip">
      <div className="rc-tooltip-title">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="rc-tooltip-row">
          <span className="swatch" style={{ background: p.color }} />
          {p.dataKey === 'baseline' ? baselineName : targets.find((t: TargetMeta) => t.key === p.dataKey)?.name}: {p.value}%
        </div>
      ))}
    </div>
  );
}

export default function AttributeDrilldown({
  rows,
  attributeOptions,
  selectedField,
  onSelectField,
  baselineKey,
  baselineName,
  targets,
}: {
  rows: ProfileRow[];
  attributeOptions: { field_name: string; attribute_label: string }[];
  selectedField: string | null;
  onSelectField: (fieldName: string) => void;
  baselineKey: string;
  baselineName: string;
  targets: TargetMeta[];
}) {
  const data = useMemo(() => {
    if (!selectedField) return [];
    const values: string[] = [];
    const seen = new Set<string>();
    rows.forEach((r) => {
      if (r.field_name !== selectedField || r.segment_field_respondents < MIN_SAMPLE) return;
      if ((r.segment_key === baselineKey || targets.some((t) => t.key === r.segment_key)) && !seen.has(r.value_label)) {
        seen.add(r.value_label);
        values.push(r.value_label);
      }
    });
    return values.map((value_label) => {
      const row: Record<string, string | number | null> = { value_label };
      const baseRow = rows.find((r) => r.field_name === selectedField && r.segment_key === baselineKey && r.value_label === value_label);
      row.baseline = baseRow?.segment_pct ?? 0;
      targets.forEach((t) => {
        const tRow = rows.find((r) => r.field_name === selectedField && r.segment_key === t.key && r.value_label === value_label);
        row[t.key] = tRow?.segment_pct ?? 0;
      });
      return row;
    });
  }, [rows, selectedField, baselineKey, targets]);

  const height = Math.max(180, data.length * 42 + 30);
  const isNarrow = useIsNarrow();
  const labelWidth = isNarrow ? 110 : 200;

  return (
    <div>
      <div className="control-field" style={{ maxWidth: 420, marginBottom: 14 }}>
        <label htmlFor="attribute-select">Attribute</label>
        <select
          id="attribute-select"
          value={selectedField ?? ''}
          onChange={(e) => onSelectField(e.target.value)}
        >
          {attributeOptions.map((o) => (
            <option key={o.field_name} value={o.field_name}>{o.attribute_label}</option>
          ))}
        </select>
      </div>

      {selectedField && data.length > 0 ? (
        <>
          <div className="chart-legend">
            <span className="legend-item">
              <span className="legend-swatch" style={{ background: 'var(--series-baseline)' }} />
              {baselineName}
            </span>
            {targets.map((t) => (
              <span key={t.key} className="legend-item">
                <span className="legend-swatch" style={{ background: colorForSegment(t.key, 'target').light }} />
                {t.name}
              </span>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }} barCategoryGap="26%">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--gridline)" horizontal={false} />
              <XAxis type="number" unit="%" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={{ stroke: 'var(--baseline-axis)' }} tickLine={false} />
              <YAxis type="category" dataKey="value_label" width={labelWidth} tick={{ fill: 'var(--text-primary)', fontSize: 11 }} axisLine={{ stroke: 'var(--baseline-axis)' }} tickLine={false} />
              <Tooltip content={<DrilldownTooltip baselineName={baselineName} targets={targets} />} cursor={{ fill: 'var(--gridline)', opacity: 0.4 }} />
              <Bar dataKey="baseline" name={baselineName} fill="var(--series-baseline)" radius={2} maxBarSize={12} />
              {targets.map((t) => (
                <Bar key={t.key} dataKey={t.key} name={t.name} fill={colorForSegment(t.key, 'target').light} radius={2} maxBarSize={12} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </>
      ) : (
        <div className="empty-state">Pick an attribute to see the full value breakdown.</div>
      )}
    </div>
  );
}
