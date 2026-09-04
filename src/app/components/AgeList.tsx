/**
 * 年齢階級の一覧。バーは就業者数（万人）の線形。
 */

const one = new Intl.NumberFormat("ja-JP", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

export interface AgeRow {
  code: string;
  label: string;
  workers: number;
}

export function AgeList({
  rows,
  selected,
  onSelect,
}: {
  rows: AgeRow[];
  selected: string;
  onSelect: (code: string) => void;
}) {
  const max = Math.max(...rows.filter((r) => r.code !== "all").map((r) => r.workers), 1);

  return (
    <ul className="flex flex-col">
      {rows.map((row) => {
        const isSelected = row.code === selected;
        const isAll = row.code === "all";
        return (
          <li key={row.code} className={isAll ? "mb-1 border-b border-rule pb-1" : ""}>
            <button
              type="button"
              onClick={() => onSelect(row.code)}
              aria-pressed={isSelected}
              className={`flex w-full cursor-pointer items-center gap-2 rounded px-2 py-1 text-left transition-colors duration-150 ${
                isSelected ? "bg-ink/[0.06]" : "hover:bg-ink/[0.03]"
              }`}
            >
              <span
                className={`w-[4.5rem] shrink-0 text-[12px] ${
                  isSelected ? "font-semibold text-ink" : "text-muted"
                }`}
              >
                {row.label}
              </span>
              <span
                className={`tnum w-[3.25rem] shrink-0 text-right text-[11px] ${
                  isSelected ? "text-ink" : "text-faint"
                }`}
              >
                {one.format(row.workers)}
              </span>
              {isAll ? (
                <span className="flex-1" />
              ) : (
                <span className="h-[9px] flex-1 bg-ink/[0.05]">
                  <span
                    className={`block h-full ${isSelected ? "bg-accent" : "bg-accent/45"}`}
                    style={{ width: `${(row.workers / max) * 100}%` }}
                  />
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
