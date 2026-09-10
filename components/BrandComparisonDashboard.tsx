'use client';

// components/BrandComparisonDashboard.tsx
//
// Dashboard-style view of the Customer Comparison Profile: one baseline
// (owned-brand) segment against all four M&A target brands at once,
// organized into the logical attribute groups defined in
// lib/attributeGroups.ts. An Overview tab leads with a group x target
// similarity heatmap and the biggest differentiators overall; each group
// tab drills into that group's own differentiators plus a full
// attribute-level breakdown.
//
// Data source: GET /api/audience-profile, which queries
// yg_segment_profile in production and falls back to a realistic mock
// fixture outside production (see lib/mockProfileData.ts) so this is
// previewable without BigQuery credentials.

import { useEffect, useMemo, useState } from 'react';
import { ALL_GROUPS, groupFor } from '@/lib/attributeGroups';
import { computeDifferentiators, computeGroupedDifferentiators } from '@/lib/differentiators';
import { MIN_SAMPLE, ProfileRow, TARGET_SEGMENT_KEYS } from '@/lib/profileTypes';
import { colorForSegment } from '@/lib/segmentPalette';
import { computeGroupSimilarity, fitScore } from '@/lib/similarity';
import AttributeDrilldown from '@/components/dashboard/AttributeDrilldown';
import DifferentiatorChart from '@/components/dashboard/DifferentiatorChart';
import SegmentControls from '@/components/dashboard/SegmentControls';
import SimilarityHeatmap from '@/components/dashboard/SimilarityHeatmap';
import StatTile from '@/components/dashboard/StatTile';

interface SegmentOption {
  segment_key: string;
  segment_name: string;
  segment_size: number;
}

function uniqueSegments(rows: ProfileRow[] | null, role: 'baseline' | 'target'): SegmentOption[] {
  if (!rows) return [];
  const map = new Map<string, SegmentOption>();
  rows.forEach((r) => {
    if (r.segment_role === role) {
      map.set(r.segment_key, { segment_key: r.segment_key, segment_name: r.segment_name, segment_size: r.segment_size });
    }
  });
  return Array.from(map.values());
}

function useProfileData() {
  const [rows, setRows] = useState<ProfileRow[] | null>(null);
  const [source, setSource] = useState<'bigquery' | 'mock' | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/audience-profile')
      .then((r) => r.json())
      .then((json) => {
        if (json.error) setError(json.error);
        else {
          setRows(json.rows);
          setSource(json.source ?? null);
        }
      })
      .catch((e) => setError(String(e)));
  }, []);

  return { rows, source, error };
}

export default function BrandComparisonDashboard() {
  const { rows, source, error } = useProfileData();

  const baselineOptions = useMemo(() => uniqueSegments(rows, 'baseline'), [rows]);
  const targetOptions = useMemo(() => uniqueSegments(rows, 'target'), [rows]);

  const [baselineKey, setBaselineKey] = useState('portfolio_total');
  const [activeTargets, setActiveTargets] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedFieldByGroup, setSelectedFieldByGroup] = useState<Record<string, string>>({});

  useEffect(() => {
    if (activeTargets.size === 0 && targetOptions.length) {
      setActiveTargets(new Set(targetOptions.map((o) => o.segment_key)));
    }
  }, [targetOptions, activeTargets.size]);

  const allTargetMeta = useMemo(
    () => TARGET_SEGMENT_KEYS
      .map((key) => targetOptions.find((o) => o.segment_key === key))
      .filter((o): o is SegmentOption => !!o)
      .map((o) => ({ key: o.segment_key, name: o.segment_name })),
    [targetOptions]
  );
  const activeTargetMeta = useMemo(
    () => allTargetMeta.filter((t) => activeTargets.has(t.key)),
    [allTargetMeta, activeTargets]
  );

  const baselineName = baselineOptions.find((o) => o.segment_key === baselineKey)?.segment_name ?? 'Baseline';
  const baselineSize = baselineOptions.find((o) => o.segment_key === baselineKey)?.segment_size;

  // groupFor() is evaluated across every row once so we know which of the
  // 12 defined groups (+ "Other") actually have data, and can hand each
  // group tab only the field_names that belong to it.
  const fieldNamesByGroup = useMemo(() => {
    const map = new Map<string, Set<string>>();
    (rows ?? []).forEach((r) => {
      const g = groupFor(r.field_name);
      if (!map.has(g.key)) map.set(g.key, new Set());
      map.get(g.key)!.add(r.field_name);
    });
    return map;
  }, [rows]);

  const visibleGroups = useMemo(
    () => ALL_GROUPS.filter((g) => fieldNamesByGroup.has(g.key)),
    [fieldNamesByGroup]
  );

  const groupSimilarities = useMemo(
    () => (rows ? computeGroupSimilarity(rows, baselineKey, [...TARGET_SEGMENT_KEYS]) : []),
    [rows, baselineKey]
  );

  const overviewDifferentiators = useMemo(
    () => (rows ? computeDifferentiators(rows, baselineKey, activeTargetMeta.map((t) => t.key), { limit: 14 }) : []),
    [rows, baselineKey, activeTargetMeta]
  );

  function toggleTarget(key: string) {
    setActiveTargets((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function jumpToGroup(groupKey: string, targetKey: string) {
    setActiveTargets((prev) => (prev.has(targetKey) ? prev : new Set(prev).add(targetKey)));
    setActiveTab(groupKey);
  }

  if (error) return <div className="error-state">Failed to load profile data: {error}</div>;
  if (!rows) return <div className="loading-state">Loading audience profile…</div>;

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Customer Comparison Dashboard</h1>
        <p>
          {baselineName} customers vs. each M&amp;A target brand&apos;s customers, indexed against
          the full audience and grouped by logical attribute area.
        </p>
        {source === 'mock' && (
          <div className="mock-banner">
            Showing sample data — the BigQuery connection isn&apos;t available in this environment.
          </div>
        )}
      </header>

      <SegmentControls
        baselineOptions={baselineOptions}
        baselineKey={baselineKey}
        onBaselineChange={setBaselineKey}
        targetOptions={targetOptions}
        activeTargets={activeTargets}
        onToggleTarget={toggleTarget}
      />

      <div className="stat-grid">
        {baselineSize != null && (
          <StatTile label={`${baselineName} customers`} value={baselineSize.toLocaleString()} color="var(--series-baseline)" />
        )}
        {activeTargetMeta.map((t) => {
          const score = fitScore(groupSimilarities, t.key);
          const size = targetOptions.find((o) => o.segment_key === t.key)?.segment_size;
          return (
            <StatTile
              key={t.key}
              label={`${t.name} fit score`}
              value={score != null ? `${score}` : '—'}
              sub={size != null ? `n=${size.toLocaleString()} customers` : undefined}
              color={colorForSegment(t.key, 'target').light}
            />
          );
        })}
      </div>

      <div className="tabs">
        <button
          type="button"
          className={`tab-btn${activeTab === 'overview' ? ' active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        {visibleGroups.map((g) => (
          <button
            key={g.key}
            type="button"
            className={`tab-btn${activeTab === g.key ? ' active' : ''}`}
            onClick={() => setActiveTab(g.key)}
          >
            {g.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' ? (
        <>
          <section className="card">
            <div className="card-title">Where each target is similar or different, by group</div>
            <p className="card-desc">
              Average percentage-point spread vs. {baselineName} within each attribute group.
            </p>
            <SimilarityHeatmap groups={groupSimilarities} targets={activeTargetMeta} onSelect={jumpToGroup} />
          </section>

          <section className="card">
            <div className="card-title">Biggest differentiators overall</div>
            <p className="card-desc">
              Ranked by the largest percentage-point gap vs. {baselineName} across any active target,
              restricted to cells with at least {MIN_SAMPLE} respondents in both segments.
            </p>
            <DifferentiatorChart entries={overviewDifferentiators} targets={activeTargetMeta} showGroupLabel />
          </section>
        </>
      ) : (
        <GroupPanel
          groupKey={activeTab}
          rows={rows}
          baselineKey={baselineKey}
          baselineName={baselineName}
          targets={activeTargetMeta}
          selectedField={selectedFieldByGroup[activeTab] ?? null}
          onSelectField={(fieldName) => setSelectedFieldByGroup((prev) => ({ ...prev, [activeTab]: fieldName }))}
        />
      )}
    </div>
  );
}

function GroupPanel({
  groupKey,
  rows,
  baselineKey,
  baselineName,
  targets,
  selectedField,
  onSelectField,
}: {
  groupKey: string;
  rows: ProfileRow[];
  baselineKey: string;
  baselineName: string;
  targets: { key: string; name: string }[];
  selectedField: string | null;
  onSelectField: (fieldName: string) => void;
}) {
  const group = ALL_GROUPS.find((g) => g.key === groupKey);

  const fieldNames = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      if (groupFor(r.field_name).key === groupKey) set.add(r.field_name);
    });
    return set;
  }, [rows, groupKey]);

  const attributeOptions = useMemo(() => {
    const seen = new Map<string, string>();
    rows.forEach((r) => {
      if (fieldNames.has(r.field_name)) seen.set(r.field_name, r.attribute_label);
    });
    return Array.from(seen.entries())
      .map(([field_name, attribute_label]) => ({ field_name, attribute_label }))
      .sort((a, b) => a.attribute_label.localeCompare(b.attribute_label));
  }, [rows, fieldNames]);

  const effectiveField = selectedField && fieldNames.has(selectedField) ? selectedField : attributeOptions[0]?.field_name ?? null;

  const differentiators = useMemo(
    () => computeGroupedDifferentiators(rows, baselineKey, targets.map((t) => t.key), { fieldNames, topAttributes: 6 }),
    [rows, baselineKey, targets, fieldNames]
  );

  return (
    <>
      <section className="card">
        <div className="card-title">{group?.label ?? groupKey}</div>
        <p className="card-desc">{group?.description}</p>
        <div className="card-header-row" />
        <h3 style={{ fontSize: '0.9rem', fontWeight: 600, margin: '4px 0 2px' }}>Top differentiators in this group</h3>
        <p className="card-desc">
          {(() => {
            const n = new Set(differentiators.map((d) => d.field_name)).size;
            return `The ${n} attribute${n === 1 ? '' : 's'} with the biggest gap vs. ${baselineName}, each shown in full so the whole distribution reads together.`;
          })()}
        </p>
        <DifferentiatorChart entries={differentiators} targets={targets} />
      </section>

      <section className="card">
        <h3 style={{ fontSize: '0.9rem', fontWeight: 600, margin: '0 0 10px' }}>Full attribute breakdown</h3>
        <AttributeDrilldown
          rows={rows}
          attributeOptions={attributeOptions}
          selectedField={effectiveField}
          onSelectField={onSelectField}
          baselineKey={baselineKey}
          baselineName={baselineName}
          targets={targets}
        />
      </section>
    </>
  );
}
