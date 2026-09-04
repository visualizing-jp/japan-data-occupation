/**
 * 時代ビュー。2009–2025 の職種別就業者数と構成比。
 */

import { use, useMemo, useState } from "react";
import { loadEra, type Sex } from "../data/chunks.ts";
import { listOccupations, TOTAL_OCC_LFS } from "../data/hierarchy.ts";
import { MARKS, NOTES } from "../data/annotations.ts";
import { OccList } from "../components/OccList.tsx";
import { Segmented } from "../components/Segmented.tsx";
import { TrendStack, type Panel, type Point } from "../components/TrendStack.tsx";
import { useWidth } from "../hooks/useWidth.ts";
import { useUrlState } from "../hooks/useUrlState.ts";

const SEXES = [
  { value: "total", label: "総数" },
  { value: "male", label: "男" },
  { value: "female", label: "女" },
] as const satisfies readonly { value: Sex; label: string }[];

const FROM = 2009;
const TO = 2025;

const one = new Intl.NumberFormat("ja-JP", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});
const pct = new Intl.NumberFormat("ja-JP", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function dense(years: number[], values: (number | null)[]): Point[] {
  const byYear = new Map(years.map((y, i) => [y, values[i] ?? null]));
  return Array.from({ length: TO - FROM + 1 }, (_, i) => ({
    year: FROM + i,
    value: byYear.get(FROM + i) ?? null,
  }));
}

export function EraView() {
  const { occupations, cube, years } = use(loadEra());
  const selectable = useMemo(
    () => listOccupations(occupations, TOTAL_OCC_LFS),
    [occupations],
  );
  const defaultOcc = selectable.find((o) => o.code === "002")?.code ?? selectable[0]!.code;

  const [occ, setOcc] = useUrlState<string>("occ", defaultOcc, (v) =>
    selectable.some((c) => c.code === v),
  );
  const [sex, setSex] = useUrlState<Sex>("sex", "total", (v) =>
    SEXES.some((s) => s.value === v),
  );
  const [hoverYear, setHoverYear] = useState<number | null>(null);
  const [ref, width] = useWidth<HTMLDivElement>();

  const current = selectable.find((c) => c.code === occ)!;

  const rows = useMemo(
    () =>
      selectable.map((c) => ({
        occ: c,
        values: cube.series("share", "year", { occ: c.code, sex }),
      })),
    [selectable, cube, sex],
  );

  const panels = useMemo((): Panel[] => {
    const at = (measure: string) => cube.series(measure, "year", { occ, sex });
    return [
      {
        key: "workers",
        title: "就業者数",
        unit: "万人",
        format: (v) => one.format(v),
        formatTick: (v) => one.format(v),
        series: [
          {
            key: "workers",
            label: "",
            points: dense(years, at("workers")),
            emphasized: true,
          },
        ],
      },
      {
        key: "share",
        title: "構成比",
        unit: "就業者全体に占める割合",
        format: (v) => `${pct.format(v * 100)}%`,
        formatTick: (v) => `${pct.format(v * 100)}%`,
        series: [
          {
            key: "share",
            label: "",
            points: dense(years, at("share")),
            emphasized: true,
          },
        ],
      },
    ];
  }, [cube, occ, sex, years]);

  return (
    <div className="mx-auto flex w-full max-w-[1240px] gap-8 px-6 py-6 max-lg:flex-col-reverse">
      <aside className="w-[288px] shrink-0 max-lg:w-full">
        <h2 className="px-2 pb-1 text-[11px] font-semibold tracking-wide text-faint">
          職業（平成21年改定）
        </h2>
        <div className="max-h-[70vh] overflow-y-auto lg:max-h-[calc(100dvh-8rem)]">
          <OccList rows={rows} years={years} selected={occ} onSelect={setOcc} />
        </div>
        <p className="px-2 pt-3 text-[10.5px] leading-relaxed text-faint">
          折れ線は構成比の推移。高さは項目ごとに正規化してあるので、項目間の大小は比べられない。
        </p>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="flex flex-wrap items-baseline justify-between gap-3 pb-4">
          <div className="flex items-baseline gap-3">
            <h1 className="text-[19px] font-semibold tracking-tight">{current.label}</h1>
            <p
              className={`tnum text-[13px] ${hoverYear === null ? "text-faint" : "text-ink"}`}
            >
              {hoverYear ?? TO}年
            </p>
          </div>
          <Segmented options={SEXES} value={sex} onChange={setSex} label="性別" />
        </header>

        <div ref={ref} className="min-h-[420px]">
          {width > 0 && (
            <TrendStack
              panels={panels}
              domain={[FROM, TO]}
              width={width}
              hoverYear={hoverYear}
              onHoverYear={setHoverYear}
            />
          )}
        </div>

        <section className="mt-6 border-t border-rule pt-4">
          <h2 className="text-[11px] font-semibold tracking-wide text-faint">注記</h2>
          <dl className="mt-2 grid gap-x-8 gap-y-3 sm:grid-cols-2">
            {[
              ...MARKS.map((m) => ({
                key: String(m.year),
                term: `${m.year}年 · ${m.label}`,
                detail: m.detail,
              })),
              ...NOTES.map((n) => ({
                key: n.term,
                term: n.term,
                detail: n.detail,
              })),
            ].map((n) => (
              <div key={n.key}>
                <dt className="tnum text-[12px] font-semibold">{n.term}</dt>
                <dd className="text-[11.5px] leading-relaxed text-muted">{n.detail}</dd>
              </div>
            ))}
          </dl>
        </section>
      </main>
    </div>
  );
}
