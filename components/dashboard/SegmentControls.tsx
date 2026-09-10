import { colorForSegment } from '@/lib/segmentPalette';

interface SegmentOption {
  segment_key: string;
  segment_name: string;
  segment_size: number;
}

export default function SegmentControls({
  baselineOptions,
  baselineKey,
  onBaselineChange,
  targetOptions,
  activeTargets,
  onToggleTarget,
}: {
  baselineOptions: SegmentOption[];
  baselineKey: string;
  onBaselineChange: (key: string) => void;
  targetOptions: SegmentOption[];
  activeTargets: Set<string>;
  onToggleTarget: (key: string) => void;
}) {
  return (
    <div className="controls-bar">
      <div className="control-field">
        <label htmlFor="baseline-select">Baseline segment</label>
        <select
          id="baseline-select"
          value={baselineKey}
          onChange={(e) => onBaselineChange(e.target.value)}
        >
          {baselineOptions.map((o) => (
            <option key={o.segment_key} value={o.segment_key}>
              {o.segment_name} (n={o.segment_size.toLocaleString()})
            </option>
          ))}
        </select>
      </div>

      <div className="control-field" style={{ flex: 1 }}>
        <label>M&amp;A target brands</label>
        <div className="target-toggles">
          {targetOptions.map((o) => {
            const color = colorForSegment(o.segment_key, 'target').light;
            const active = activeTargets.has(o.segment_key);
            return (
              <button
                key={o.segment_key}
                type="button"
                className={`target-chip${active ? ' active' : ''}`}
                style={{ ['--chip-color' as string]: color }}
                onClick={() => onToggleTarget(o.segment_key)}
                aria-pressed={active}
              >
                <span className="swatch" />
                {o.segment_name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
