// lib/similarity.ts
//
// One "how different is this target from the baseline" number per
// (logical attribute group x target brand), for the overview heatmap.
//
// The metric is total variation distance: for a single attribute,
// 0.5 * sum(|target_pct_v - baseline_pct_v|) across its values -- 0 means
// identical distributions, and it approaches 100 as they share nothing.
// A group's score is the average of that across every attribute in the
// group both segments have adequate sample for.

import { ALL_GROUPS, groupFor } from './attributeGroups';
import { MIN_SAMPLE, ProfileRow } from './profileTypes';

export interface GroupSimilarity {
  group_key: string;
  group_label: string;
  scores: Record<string, number | null>;
}

export function computeGroupSimilarity(
  rows: ProfileRow[],
  baselineKey: string,
  targetKeys: string[]
): GroupSimilarity[] {
  const bySegField = new Map<string, ProfileRow[]>();
  const fieldNamesByGroup = new Map<string, Set<string>>();

  rows.forEach((r) => {
    const group = groupFor(r.field_name);
    if (!fieldNamesByGroup.has(group.key)) fieldNamesByGroup.set(group.key, new Set());
    fieldNamesByGroup.get(group.key)!.add(r.field_name);

    if (r.segment_field_respondents < MIN_SAMPLE) return;
    const k = `${r.segment_key}::${r.field_name}`;
    if (!bySegField.has(k)) bySegField.set(k, []);
    bySegField.get(k)!.push(r);
  });

  const results: GroupSimilarity[] = [];

  fieldNamesByGroup.forEach((fieldNames, groupKey) => {
    const groupMeta = ALL_GROUPS.find((g) => g.key === groupKey);
    const scores: Record<string, number | null> = {};

    targetKeys.forEach((tk) => {
      const tvds: number[] = [];
      fieldNames.forEach((fn) => {
        const baseRows = bySegField.get(`${baselineKey}::${fn}`);
        const targetRows = bySegField.get(`${tk}::${fn}`);
        if (!baseRows || !targetRows) return;

        const baseByValue = new Map(baseRows.map((r) => [r.field_value, r.segment_pct]));
        let tvd = 0;
        let matched = 0;
        targetRows.forEach((r) => {
          const bPct = baseByValue.get(r.field_value);
          if (bPct === undefined) return;
          tvd += Math.abs(r.segment_pct - bPct);
          matched++;
        });
        if (matched > 0) tvds.push(tvd / 2);
      });

      scores[tk] = tvds.length
        ? Math.round((tvds.reduce((a, b) => a + b, 0) / tvds.length) * 10) / 10
        : null;
    });

    results.push({ group_key: groupKey, group_label: groupMeta?.label ?? groupKey, scores });
  });

  results.sort(
    (a, b) =>
      ALL_GROUPS.findIndex((g) => g.key === a.group_key) -
      ALL_GROUPS.findIndex((g) => g.key === b.group_key)
  );

  return results;
}

// A single 0-100 "how much like the baseline is this target, overall"
// headline number -- 100 minus the average group difference score.
export function fitScore(groupSimilarities: GroupSimilarity[], targetKey: string): number | null {
  const vals = groupSimilarities
    .map((g) => g.scores[targetKey])
    .filter((v): v is number => v !== null);
  if (!vals.length) return null;
  const avgDiff = vals.reduce((a, b) => a + b, 0) / vals.length;
  return Math.max(0, Math.round(100 - avgDiff));
}
