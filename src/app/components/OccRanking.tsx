/**
 * 選んだ年齢階級の職種ランキング。
 * 右端のスパークは各年齢階級での構成比。
 */

import { line } from "d3-shape";
import { scaleLinear } from "d3-scale";

const SPARK_W = 76;
const SPARK_H = 18;

const one = new Intl.NumberFormat("ja-JP", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});
const pct = new Intl.NumberFormat("ja-JP", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export interface RankRow {
  code: string;
  label: string;
  workers: number;
  share: number;
  shareByAge: number[];
}

export function OccRanking({
  rows,
  rest,
  ageIndex,
}: {
  rows: RankRow[];
  rest: { count: number; workers: number; share: number } | null;
  ageIndex: number | null;
}) {
  return (
    <ol className="flex flex-col">
      {rows.map((row, i) => (
        <li
          key={row.code}
          className="flex items-center gap-3 rounded px-2 py-[3px] transition-colors duration-150 hover:bg-ink/[0.03]"
        >
          <span className="tnum w-4 shrink-0 text-right text-[11px] text-faint">
            {i + 1}
          </span>
          <span
            className="w-[17rem] shrink-0 truncate text-[12.5px] max-md:w-[10rem]"
            title={row.label}
          >
            {row.label}
          </span>
          <span className="hidden h-[10px] min-w-0 flex-1 bg-ink/[0.05] sm:block">
            <span
              className="block h-full bg-accent/70"
              style={{ width: `${row.share * 100}%` }}
            />
          </span>
          <span className="tnum w-[3.5rem] shrink-0 text-right text-[12px]">
            {one.format(row.workers)}
          </span>
          <span className="tnum w-[3.25rem] shrink-0 text-right text-[11px] text-muted">
            {pct.format(row.share * 100)}%
          </span>
          <Spark values={row.shareByAge} markAt={ageIndex} />
        </li>
      ))}

      {rest !== null && rest.count > 0 && (
        <li className="mt-1 flex items-center gap-3 border-t border-rule px-2 pt-2 text-faint">
          <span className="w-4 shrink-0" />
          <span className="w-[17rem] shrink-0 truncate text-[12px] max-md:w-[10rem]">
            その他 {rest.count} 項目
          </span>
          <span className="hidden min-w-0 flex-1 sm:block" />
          <span className="tnum w-[3.5rem] shrink-0 text-right text-[12px]">
            {one.format(rest.workers)}
          </span>
          <span className="tnum w-[3.25rem] shrink-0 text-right text-[11px]">
            {pct.format(rest.share * 100)}%
          </span>
          <span className="shrink-0" style={{ width: SPARK_W }} />
        </li>
      )}
    </ol>
  );
}

function Spark({ values, markAt }: { values: number[]; markAt: number | null }) {
  const max = Math.max(...values, 0);
  const x = scaleLinear()
    .domain([0, Math.max(values.length - 1, 1)])
    .range([1, SPARK_W - 1]);
  const y = scaleLinear()
    .domain([0, max || 1])
    .range([SPARK_H - 2, 2]);
  const path = line<number>()
    .x((_, i) => x(i))
    .y((v) => y(v));

  return (
    <svg width={SPARK_W} height={SPARK_H} className="shrink-0" aria-hidden>
      <path
        d={path(values) ?? undefined}
        fill="none"
        className="stroke-muted"
        strokeWidth={1}
        strokeLinejoin="round"
      />
      {markAt !== null && values[markAt] !== undefined && (
        <circle cx={x(markAt)} cy={y(values[markAt]!)} r={2} className="fill-accent" />
      )}
    </svg>
  );
}
