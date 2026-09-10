'use client';

import { GroupSimilarity } from '@/lib/similarity';

interface TargetMeta {
  key: string;
  name: string;
}

function heatLevel(value: number, max: number): number {
  if (max <= 0) return 0;
  const ratio = value / max;
  if (ratio < 0.15) return 0;
  if (ratio < 0.35) return 1;
  if (ratio < 0.6) return 2;
  if (ratio < 0.85) return 3;
  return 4;
}

export default function SimilarityHeatmap({
  groups,
  targets,
  onSelect,
}: {
  groups: GroupSimilarity[];
  targets: TargetMeta[];
  onSelect: (groupKey: string, targetKey: string) => void;
}) {
  const allValues = groups.flatMap((g) => targets.map((t) => g.scores[t.key])).filter(
    (v): v is number => v !== null
  );
  const max = allValues.length ? Math.max(...allValues) : 1;

  return (
    <div className="heatmap-scroll">
      <div
        className="heatmap"
        style={{ gridTemplateColumns: `minmax(180px, 240px) repeat(${targets.length}, minmax(90px, 1fr))` }}
      >
        <div className="heatmap-header-cell" style={{ textAlign: 'left' }}>
          Attribute group
        </div>
        {targets.map((t) => (
          <div key={t.key} className="heatmap-header-cell">
            {t.name}
          </div>
        ))}

        {groups.map((g) => (
          <div key={g.group_key} style={{ display: 'contents' }}>
            <div className="heatmap-row-label">{g.group_label}</div>
            {targets.map((t) => {
              const val = g.scores[t.key];
              if (val === null) {
                return (
                  <div key={t.key} className="heatmap-cell heat-null">
                    <span className="cell-value">–</span>
                  </div>
                );
              }
              const level = heatLevel(val, max);
              return (
                <button
                  key={t.key}
                  type="button"
                  className={`heatmap-cell heat-${level}`}
                  onClick={() => onSelect(g.group_key, t.key)}
                  title={`${g.group_label} vs ${t.name}: difference score ${val}`}
                >
                  <span className="cell-value">{val}</span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 10 }}>
        Difference score: average percentage-point spread between each target&apos;s customers and
        the baseline across that group&apos;s attributes. Lower (lighter) = more similar; higher
        (darker) = more different. Click a cell to jump to that group filtered to that target.
      </p>
    </div>
  );
}
