// lib/differentiators.ts
//
// Ranks attribute-values by how much each M&A target's composition differs
// from the selected baseline, restricted to cells with enough sample in
// both segments.
//
// Two views on the same underlying entries:
//  - computeDifferentiators: flat ranking by gap size, biggest gap first.
//    Used by the overview's "biggest differentiators overall" chart, where
//    the point is a cross-group leaderboard.
//  - computeGroupedDifferentiators: picks the top-N most differentiating
//    *attributes*, then keeps every value of each one together in its
//    natural (field_value) order. Used by each group tab's chart, where
//    scattering an attribute's values across the chart by gap size would
//    make it hard to read the attribute as a whole (e.g. Urban/Suburban/
//    Rural should stay adjacent even if only Urban and Rural have a big gap).

import { MIN_SAMPLE, ProfileRow } from './profileTypes';
import { groupFor } from './attributeGroups';

export interface DifferentiatorEntry {
  id: string;
  field_name: string;
  field_value: string;
  attribute_label: string;
  value_label: string;
  group_key: string;
  group_label: string;
  baseline_pct: number;
  targets: Record<string, { pct: number; gap: number }>;
  maxAbsGap: number;
}

function buildEntries(
  rows: ProfileRow[],
  baselineKey: string,
  targetKeys: string[],
  fieldNames?: Set<string>
): DifferentiatorEntry[] {
  const baselineMap = new Map<string, ProfileRow>();
  rows.forEach((r) => {
    if (r.segment_key !== baselineKey || r.segment_field_respondents < MIN_SAMPLE) return;
    if (fieldNames && !fieldNames.has(r.field_name)) return;
    baselineMap.set(`${r.field_name}::${r.field_value}`, r);
  });

  const targetMaps = new Map<string, Map<string, ProfileRow>>();
  targetKeys.forEach((tk) => {
    const m = new Map<string, ProfileRow>();
    rows.forEach((r) => {
      if (r.segment_key === tk && r.segment_field_respondents >= MIN_SAMPLE) {
        m.set(`${r.field_name}::${r.field_value}`, r);
      }
    });
    targetMaps.set(tk, m);
  });

  const entries: DifferentiatorEntry[] = [];
  baselineMap.forEach((baseRow, key) => {
    const targets: DifferentiatorEntry['targets'] = {};
    let maxAbsGap = 0;

    targetKeys.forEach((tk) => {
      const tRow = targetMaps.get(tk)?.get(key);
      if (!tRow) return;
      const gap = Math.round((tRow.segment_pct - baseRow.segment_pct) * 10) / 10;
      targets[tk] = { pct: tRow.segment_pct, gap };
      maxAbsGap = Math.max(maxAbsGap, Math.abs(gap));
    });

    if (Object.keys(targets).length === 0) return;

    const group = groupFor(baseRow.field_name);
    entries.push({
      id: key,
      field_name: baseRow.field_name,
      field_value: baseRow.field_value,
      attribute_label: baseRow.attribute_label,
      value_label: baseRow.value_label,
      group_key: group.key,
      group_label: group.label,
      baseline_pct: baseRow.segment_pct,
      targets,
      maxAbsGap,
    });
  });

  return entries;
}

export function computeDifferentiators(
  rows: ProfileRow[],
  baselineKey: string,
  targetKeys: string[],
  opts: { fieldNames?: Set<string>; limit?: number } = {}
): DifferentiatorEntry[] {
  const entries = buildEntries(rows, baselineKey, targetKeys, opts.fieldNames);
  entries.sort((a, b) => b.maxAbsGap - a.maxAbsGap);
  return opts.limit ? entries.slice(0, opts.limit) : entries;
}

// field_value is a dictionary code (often but not always numeric); sort
// numerically where possible so ordinal scales (age brackets, income tiers)
// read low-to-high instead of "1, 10, 2, 3...".
function fieldValueSortKey(fieldValue: string): number {
  const n = Number(fieldValue);
  return Number.isFinite(n) ? n : Number.POSITIVE_INFINITY;
}

export function computeGroupedDifferentiators(
  rows: ProfileRow[],
  baselineKey: string,
  targetKeys: string[],
  opts: { fieldNames?: Set<string>; topAttributes?: number } = {}
): DifferentiatorEntry[] {
  const entries = buildEntries(rows, baselineKey, targetKeys, opts.fieldNames);

  const maxGapByField = new Map<string, number>();
  entries.forEach((e) => {
    maxGapByField.set(e.field_name, Math.max(maxGapByField.get(e.field_name) ?? 0, e.maxAbsGap));
  });

  const topAttributes = opts.topAttributes ?? 6;
  const topFieldOrder = Array.from(maxGapByField.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topAttributes)
    .map(([fieldName]) => fieldName);
  const fieldRank = new Map(topFieldOrder.map((fieldName, i) => [fieldName, i]));

  return entries
    .filter((e) => fieldRank.has(e.field_name))
    .sort((a, b) => {
      const rankDiff = fieldRank.get(a.field_name)! - fieldRank.get(b.field_name)!;
      if (rankDiff !== 0) return rankDiff;
      return fieldValueSortKey(a.field_value) - fieldValueSortKey(b.field_value);
    });
}
