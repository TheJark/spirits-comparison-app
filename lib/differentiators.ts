// lib/differentiators.ts
//
// Ranks attribute-values by how much each M&A target's composition differs
// from the selected baseline, restricted to cells with enough sample in
// both segments. Shared by the overview's "top differentiators across
// everything" chart and each group tab's "top differentiators in this
// group" chart -- only the input row set (all rows vs. one group's rows)
// differs.

import { MIN_SAMPLE, ProfileRow } from './profileTypes';
import { groupFor } from './attributeGroups';

export interface DifferentiatorEntry {
  id: string;
  attribute_label: string;
  value_label: string;
  group_key: string;
  group_label: string;
  baseline_pct: number;
  targets: Record<string, { pct: number; gap: number }>;
  maxAbsGap: number;
}

export function computeDifferentiators(
  rows: ProfileRow[],
  baselineKey: string,
  targetKeys: string[],
  opts: { fieldNames?: Set<string>; limit?: number } = {}
): DifferentiatorEntry[] {
  const baselineMap = new Map<string, ProfileRow>();
  rows.forEach((r) => {
    if (r.segment_key !== baselineKey || r.segment_field_respondents < MIN_SAMPLE) return;
    if (opts.fieldNames && !opts.fieldNames.has(r.field_name)) return;
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
      attribute_label: baseRow.attribute_label,
      value_label: baseRow.value_label,
      group_key: group.key,
      group_label: group.label,
      baseline_pct: baseRow.segment_pct,
      targets,
      maxAbsGap,
    });
  });

  entries.sort((a, b) => b.maxAbsGap - a.maxAbsGap);
  return opts.limit ? entries.slice(0, opts.limit) : entries;
}
