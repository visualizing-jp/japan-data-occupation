/**
 * 年齢ビュー。職種ランキング × 年齢5歳階級 × 性 × 年。
 */

import { use, useMemo } from "react";
import { loadOccAge, type Sex } from "../data/chunks.ts";
import { leafOccupations, TOTAL_OCC_LFS } from "../data/hierarchy.ts";
import { AgeList, type AgeRow } from "../components/AgeList.tsx";
import { OccRanking, type RankRow } from "../components/OccRanking.tsx";
import { Segmented } from "../components/Segmented.tsx";
import { YearSelect } from "../components/YearSelect.tsx";
import { useUrlState } from "../hooks/useUrlState.ts";

const SEXES = [
  { value: "total", label: "総数" },
  { value: "male", label: "男" },
  { value: "female", label: "女" },
] as const satisfies readonly { value: Sex; label: string }[];

const ALL = "all";
const TOP_N = 15;

const one = new Intl.NumberFormat("ja-JP", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});
const pct = new Intl.NumberFormat("ja-JP", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const sum = (xs: (number | null)[]) => xs.reduce<number>((n, v) => n + (v ?? 0), 0);

export function AgeView() {
  const { occupations, ages, cube, years } = use(loadOccAge());
  const leaves = useMemo(
    () => leafOccupations(occupations, TOTAL_OCC_LFS),
    [occupations],
  );

  const [year, setYear] = useUrlState("year", years[0]!, (v) => years.includes(v));
  const [sex, setSex] = useUrlState<Sex>("sex", "total", (v) =>
    SEXES.some((s) => s.value === v),
  );
  const [age, setAge] = useUrlState<string>("age", ALL, (v) =>
    v === ALL || ages.some((a) => a.code === v),
  );

  const matrix = useMemo(
    () =>
      leaves.map((c) => cube.series("workers", "age", { occ: c.code, sex, year })),
    [leaves, cube, sex, year],
  );
  const totalByAge = useMemo(
    () => cube.series("workers", "age", { occ: TOTAL_OCC_LFS, sex, year }),
    [cube, sex, year],
  );

  const ageRows = useMemo((): AgeRow[] => {
    const bands = ages.map((a, i) => ({
      code: a.code,
      label: a.label,
      workers: totalByAge[i] ?? 0,
    }));
    return [{ code: ALL, label: "全年齢", workers: sum(totalByAge) }, ...bands];
  }, [ages, totalByAge]);

  const ageIndex = age === ALL ? null : ages.findIndex((a) => a.code === age);
  const total = ageIndex === null ? sum(totalByAge) : (totalByAge[ageIndex] ?? 0);
  const grandTotal = sum(totalByAge);

  const { rows, rest } = useMemo(() => {
    const all = leaves
      .map((c, ci) => {
        const byAge = matrix[ci]!;
        const workers = ageIndex === null ? sum(byAge) : (byAge[ageIndex] ?? 0);
        return {
          code: c.code,
          label: c.label,
          workers,
          share: total === 0 ? 0 : workers / total,
          shareByAge: byAge.map((v, ai) => {
            const t = totalByAge[ai] ?? 0;
            return t === 0 ? 0 : (v ?? 0) / t;
          }),
        } satisfies RankRow;
      })
      .filter((r) => r.workers > 0)
      .sort((a, b) => b.workers - a.workers);

    const shown = all.slice(0, TOP_N);
    const remainder = all.slice(TOP_N);
    return {
      rows: shown,
      rest: {
        count: remainder.length,
        workers: remainder.reduce((n, r) => n + r.workers, 0),
        share: remainder.reduce((n, r) => n + r.share, 0),
      },
    };
  }, [leaves, matrix, totalByAge, ageIndex, total]);

  const label = ageIndex === null ? "全年齢" : ages[ageIndex]!.label;

  return (
    <div className="mx-auto flex w-full max-w-[1240px] gap-8 px-6 py-6 max-lg:flex-col-reverse">
      <aside className="w-[300px] shrink-0 max-lg:w-full">
        <h2 className="px-2 pb-1 text-[11px] font-semibold tracking-wide text-faint">
          年齢階級
        </h2>
        <AgeList rows={ageRows} selected={age} onSelect={setAge} />
        <p className="px-2 pt-3 text-[10.5px] leading-relaxed text-faint">
          バーは就業者数（万人）。
        </p>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="flex flex-wrap items-baseline justify-between gap-3 pb-3">
          <div className="flex items-baseline gap-3">
            <h1 className="text-[19px] font-semibold tracking-tight">{label}の職種</h1>
            <p className="tnum text-[13px] text-muted">
              {one.format(total)}万人
              {ageIndex !== null && grandTotal > 0 && (
                <span className="text-faint">
                  {" "}
                  · 全年齢の{pct.format((total / grandTotal) * 100)}%
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <YearSelect years={years} value={year} onChange={setYear} />
            <Segmented options={SEXES} value={sex} onChange={setSex} label="性別" />
          </div>
        </header>

        <OccRanking rows={rows} rest={rest} ageIndex={ageIndex} />

        <p className="mt-4 border-t border-rule pt-3 text-[11px] leading-relaxed text-muted">
          中分類がある大分類は中分類だけで数えている（二重計上しない）。バーの長さはその年齢階級の就業者に占める割合。右端の折れ線は同じ割合を全階級について並べたもの（左が15–19歳）。人数は労働力調査の万人単位。
        </p>
      </main>
    </div>
  );
}
