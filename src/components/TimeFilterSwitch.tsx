import type { TimeFilter } from '../utils/raceGrouping';

interface TimeFilterSwitchProps {
  value: TimeFilter;
  onChange: (next: TimeFilter) => void;
}

const OPTIONS: { value: TimeFilter; label: string }[] = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'past', label: 'Past' },
];

/** Segmented Upcoming/Past control for the race list (prototype screen 1). */
export function TimeFilterSwitch({ value, onChange }: TimeFilterSwitchProps) {
  return (
    <div className="rr-segmented" role="group" aria-label="Filter by election timing">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          className="rr-segmented__btn"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
