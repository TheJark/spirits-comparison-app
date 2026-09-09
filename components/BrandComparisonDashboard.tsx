'use client';

// components/BrandComparisonDashboard.tsx
//
// Compares one BASELINE segment (your owned-brand customers, or the combined
// portfolio) against one TARGET segment (an M&A candidate's customers) across
// every characteristic attribute in the audience profile.
//
// Data source: GET /api/audience-profile (see 03_api_route.ts), which returns
// { rows: ProfileRow[] } shaped by 01_segment_comparison_profile.sql.
//
// npm install recharts

import { useEffect, useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';

interface ProfileRow {
  segment_key: string;
  segment_name: string;
  segment_role: 'baseline' | 'target';
  segment_size: number;
  category: string;
  field_name: string;
  attribute_label: string;
  field_value: string;
  value_label: string;
  segment_count: number;
  segment_field_respondents: number;
  segment_pct: number;
  population_count: number;
  pop_field_respondents: number;
  population_pct: number;
  index_vs_population: number;
}

const MIN_SAMPLE = 30;

// Characteristic field_names aren't pre-grouped into topics -- this is a
// light heuristic so ~500 attributes are browsable instead of one flat list.
// Adjust the keyword buckets to taste as you learn the field list.
function bucketFor(fieldName: string): string {
  const f = fieldName.toLowerCase();
  if (/(gross_personal|disposable_income|educ|employee_status|hhsize|household_type|race|gender|age|urbancity|region|family_life_cycle|omni_generation)/.test(f)) return 'Demographics';
  if (/(alc_|alcohol|drink|wine|beer|spirits|liquor)/.test(f)) return 'Alcohol Behavior & Spend';
  if (/(leisure|interests|life_events|travel|vac_|me_time|relax)/.test(f)) return 'Lifestyle & Interests';
  if (/(internet|isp|playvgs|vghours|browsing)/.test(f)) return 'Media & Digital';
  return 'Other';
}

function useProfileData() {
  const [rows, setRows] = useState<ProfileRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/audience-profile')
      .then((r) => r.json())
      .then((json) => {
        if (json.error) setError(json.error);
        else setRows(json.rows);
      })
      .catch((e) => setError(String(e)));
  }, []);

  return { rows, error };
}

export default function BrandComparisonDashboard() {
  const { rows, error } = useProfileData();

  const baselineOptions = useMemo(
    () => uniqueSegments(rows, 'baseline'),
    [rows]
  );
  const targetOptions = useMemo(
    () => uniqueSegments(rows, 'target'),
    [rows]
  );

  const [baselineKey, setBaselineKey] = useState('portfolio_total');
  const [targetKey, setTargetKey] = useState<string | null>(null);
  const [bucket, setBucket] = useState<string>('All');
  const [attributeField, setAttributeField] = useState<string | null>(null);

  useEffect(() => {
    if (!targetKey && targetOptions.length) setTargetKey(targetOptions[0].segment_key);
  }, [targetOptions, targetKey]);

  const baselineSize = rows?.find((r) => r.segment_key === baselineKey)?.segment_size;
  const targetSize = rows?.find((r) => r.segment_key === targetKey)?.segment_size;

  const attributeOptions = useMemo(() => {
    if (!rows) return [];
    const seen = new Map<string, string>();
    rows.forEach((r) => {
      if (bucket === 'All' || bucketFor(r.field_name) === bucket) {
        seen.set(r.field_name, r.attribute_label);
      }
    });
    return Array.from(seen.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [rows, bucket]);

  // Top differentiators: biggest percentage-point gaps between target and
  // baseline, restricted to cells with enough sample in both segments.
  const topDifferentiators = useMemo(() => {
    if (!rows || !targetKey) return [];
    const baselineMap = new Map<string, ProfileRow>();
    rows
      .filter((r) => r.segment_key === baselineKey && r.segment_field_respondents >= MIN_SAMPLE)
      .forEach((r) => baselineMap.set(`${r.field_name}::${r.field_value}`, r));

    return rows
      .filter((r) => r.segment_key === targetKey && r.segment_field_respondents >= MIN_SAMPLE)
      .map((t) => {
        const b = baselineMap.get(`${t.field_name}::${t.field_value}`);
        if (!b) return null;
        return {
          attribute_label: t.attribute_label,
          value_label: t.value_label,
          category_bucket: bucketFor(t.field_name),
          baseline_pct: b.segment_pct,
          target_pct: t.segment_pct,
          gap: Math.round((t.segment_pct - b.segment_pct) * 10) / 10,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap))
      .slice(0, 12);
  }, [rows, baselineKey, targetKey]);

  // Full value breakdown for the currently drilled-into attribute
  const attributeDetail = useMemo(() => {
    if (!rows || !attributeField || !targetKey) return [];
    const values = new Set<string>();
    rows.forEach((r) => {
      if (r.field_name === attributeField && (r.segment_key === baselineKey || r.segment_key === targetKey)) {
        values.add(r.value_label);
      }
    });
    return Array.from(values).map((value_label) => {
      const b = rows.find((r) => r.field_name === attributeField && r.segment_key === baselineKey && r.value_label === value_label);
      const t = rows.find((r) => r.field_name === attributeField && r.segment_key === targetKey && r.value_label === value_label);
      return {
        value_label,
        [baselineLabel(rows, baselineKey)]: b?.segment_pct ?? 0,
        [targetLabel(rows, targetKey)]: t?.segment_pct ?? 0,
      };
    });
  }, [rows, attributeField, baselineKey, targetKey]);

  if (error) return <div className="text-red-600 p-4">Failed to load profile data: {error}</div>;
  if (!rows) return <div className="p-4 text-gray-500">Loading audience profile…</div>;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">Customer Comparison Profile</h1>
        <p className="text-gray-500 text-sm mt-1">
          Baseline (owned-brand) customers vs. an M&amp;A target brand's customers, indexed against the full audience.
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Selector
          label="Baseline segment"
          value={baselineKey}
          onChange={setBaselineKey}
          options={baselineOptions.map((o) => ({ value: o.segment_key, label: `${o.segment_name} (n=${o.segment_size.toLocaleString()})` }))}
        />
        <Selector
          label="M&A target segment"
          value={targetKey ?? ''}
          onChange={setTargetKey}
          options={targetOptions.map((o) => ({ value: o.segment_key, label: `${o.segment_name} (n=${o.segment_size.toLocaleString()})` }))}
        />
      </div>

      <div className="flex gap-4 text-sm">
        {baselineSize != null && <SegmentSizeCard label="Baseline customers" value={baselineSize} />}
        {targetSize != null && <SegmentSizeCard label="Target customers" value={targetSize} />}
      </div>

      <section>
        <h2 className="text-lg font-medium mb-3">Where these customers differ most</h2>
        <p className="text-sm text-gray-500 mb-4">
          Ranked by percentage-point gap vs. baseline, restricted to attributes with at least {MIN_SAMPLE} respondents in both segments.
        </p>
        <div className="space-y-2">
          {topDifferentiators.map((d, i) => (
            <div key={i} className="flex items-center justify-between border-b border-gray-100 py-2 text-sm">
              <div>
                <div className="font-medium">{d.attribute_label}</div>
                <div className="text-gray-500">{d.value_label} · {d.category_bucket}</div>
              </div>
              <div className="text-right">
                <div className={d.gap > 0 ? 'text-emerald-600 font-semibold' : 'text-rose-600 font-semibold'}>
                  {d.gap > 0 ? '+' : ''}{d.gap} pts
                </div>
                <div className="text-gray-400 text-xs">{d.baseline_pct}% → {d.target_pct}%</div>
              </div>
            </div>
          ))}
          {topDifferentiators.length === 0 && (
            <div className="text-gray-400 text-sm">No overlapping attributes met the sample-size threshold yet.</div>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-medium mb-3">Drill into an attribute</h2>
        <div className="flex gap-3 mb-4">
          <Selector
            label="Category"
            value={bucket}
            onChange={setBucket}
            options={['All', 'Demographics', 'Alcohol Behavior & Spend', 'Lifestyle & Interests', 'Media & Digital', 'Other'].map((b) => ({ value: b, label: b }))}
          />
          <Selector
            label="Attribute"
            value={attributeField ?? ''}
            onChange={setAttributeField}
            options={attributeOptions.map(([field_name, label]) => ({ value: field_name, label }))}
          />
        </div>

        {attributeField && attributeDetail.length > 0 && (
          <ResponsiveContainer width="100%" height={Math.max(220, attributeDetail.length * 40)}>
            <BarChart data={attributeDetail} layout="vertical" margin={{ left: 24 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" unit="%" />
              <YAxis type="category" dataKey="value_label" width={180} />
              <Tooltip />
              <Legend />
              <ReferenceLine x={0} stroke="#ccc" />
              <Bar dataKey={baselineLabel(rows, baselineKey)} fill="#94a3b8" />
              <Bar dataKey={targetLabel(rows, targetKey)} fill="#2563eb" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </section>
    </div>
  );
}

function uniqueSegments(rows: ProfileRow[] | null, role: 'baseline' | 'target') {
  if (!rows) return [];
  const map = new Map<string, { segment_key: string; segment_name: string; segment_size: number }>();
  rows.forEach((r) => {
    if (r.segment_role === role) map.set(r.segment_key, { segment_key: r.segment_key, segment_name: r.segment_name, segment_size: r.segment_size });
  });
  return Array.from(map.values());
}

function baselineLabel(rows: ProfileRow[], key: string) {
  return rows.find((r) => r.segment_key === key)?.segment_name ?? 'Baseline';
}
function targetLabel(rows: ProfileRow[], key: string | null) {
  return rows.find((r) => r.segment_key === key)?.segment_name ?? 'Target';
}

function SegmentSizeCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-gray-200 px-4 py-2">
      <div className="text-gray-500">{label}</div>
      <div className="text-xl font-semibold">{value.toLocaleString()}</div>
    </div>
  );
}

function Selector({
  label, value, onChange, options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="text-sm flex-1">
      <span className="block text-gray-500 mb-1">{label}</span>
      <select
        className="w-full border border-gray-300 rounded-md px-2 py-1.5"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}
