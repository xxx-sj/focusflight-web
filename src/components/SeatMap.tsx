const ROWS = 10;
const COLS = ['A', 'B', 'C', 'D', 'E', 'F'] as const;

type Props = {
  selected: string | null;
  recentlyUsed: Set<string>;
  onSelect: (seat: string) => void;
};

export default function SeatMap({ selected, recentlyUsed, onSelect }: Props) {
  return (
    <div className="grid grid-cols-6 gap-2 max-w-xs mx-auto">
      {Array.from({ length: ROWS }, (_, r) =>
        COLS.map(c => {
          const label = (r + 1) + c;
          const isSel = label === selected;
          const isUsed = recentlyUsed.has(label);
          return (
            <button key={label} onClick={() => onSelect(label)}
              className={`aspect-square rounded text-xs font-mono ${
                isSel ? 'bg-orange-500 text-white ring-2 ring-orange-300' :
                isUsed ? 'bg-slate-200 text-slate-400' :
                'bg-slate-100 hover:bg-slate-200'
              }`}>
              {label}
            </button>
          );
        })
      ).flat()}
    </div>
  );
}
