/**
 * 地域ビュー。都道府県 × 職業大分類 × 性 × 年の立地係数 LQ。
 */

import { use, useMemo, useState } from "react";
import { loadGeo, type Sex } from "../data/chunks.ts";
import { TOTAL_OCC_GEO, UNCLASSIFIED_GEO } from "../data/hierarchy.ts";
import { AreaOccs, type StandoutRow } from "../components/AreaOccs.tsx";
import { OccPicker, type PickerRow } from "../components/OccPicker.tsx";
import { TileMap, type Tile } from "../components/TileMap.tsx";
import { Segmented } from "../components/Segmented.tsx";
import { YearSelect } from "../components/YearSelect.tsx";
import { useUrlState } from "../hooks/useUrlState.ts";

const STANDOUT = 8;
/** この人数未満のセルは地図を塗らない（差が見えにくい）。 */
const MIN_WORKERS = 2000;

const SEXES = [
  { value: "total", label: "総数" },
  { value: "male", label: "男" },
  { value: "female", label: "女" },
] as const satisfies readonly { value: Sex; label: string }[];

const int = new Intl.NumberFormat("ja-JP");
const one = new Intl.NumberFormat("ja-JP", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function Headline({
  ranked,
  workers,
}: {
  ranked: (Tile & { lq: number })[];
  workers: number;
}) {
  const certain = ranked.filter((t) => t.certain);
  if (certain.length === 0) {
    return (
      <span className="text-muted">
        どの県も全国との差が小さい。全国{int.format(workers)}人。
      </span>
    );
  }
  const top = certain[0]!;
  const bottom = certain.at(-1)!;
  if (certain.length === 1 || top.code === bottom.code) {
    return (
      <span className="text-muted">
        目立つのは{" "}
        <span className="font-semibold text-ink">
          {top.label} {one.format(top.lq)}
        </span>
      </span>
    );
  }
  return (
    <span className="text-muted">
      最も高い{" "}
      <span className="font-semibold text-ink">
        {top.label} {one.format(top.lq)}
      </span>
      {"  ／  最も低い "}
      <span className="font-semibold text-ink">
        {bottom.label} {one.format(bottom.lq)}
      </span>
    </span>
  );
}

export function GeoView() {
  const { occupations, areas, cube, years } = use(loadGeo());

  const [year, setYear] = useUrlState("year", years[0]!, (v) => years.includes(v));
  const [sex, setSex] = useUrlState<Sex>("sex", "total", (v) =>
    SEXES.some((s) => s.value === v),
  );
  const [occ, setOcc] = useUrlState<string>("occ", TOTAL_OCC_GEO, (v) =>
    occupations.some((c) => c.code === v),
  );
  const [area, setArea] = useUrlState<string>("area", "", (v) =>
    v === "" || areas.some((a) => a.code === v && a.code !== "00000"),
  );
  const [hovered, setHovered] = useState<string | null>(null);

  const prefectures = useMemo(() => areas.slice(1), [areas]);

  const rows = useMemo(() => {
    const of = (item: { code: string; label: string }) => ({
      ...item,
      workers: cube.series("workers", "area", { occ: item.code, sex, year }),
      lq: cube.series("lq", "area", { occ: item.code, sex, year }),
    });

    const total = of({ code: TOTAL_OCC_GEO, label: "総数（すべての職業）" });
    const majors = occupations
      .filter((o) => o.code !== TOTAL_OCC_GEO)
      .map((o) => of(o))
      .sort((a, b) => (b.workers[0] ?? 0) - (a.workers[0] ?? 0));

    return [total, ...majors];
  }, [occupations, cube, sex, year]);

  const current = rows.find((r) => r.code === occ) ?? rows[0]!;

  const picker = useMemo(
    (): PickerRow[] =>
      rows.map((r) => ({
        code: r.code,
        label: r.label,
        workers: r.workers[0] ?? 0,
      })),
    [rows],
  );

  const tiles = useMemo(
    (): Tile[] =>
      prefectures.map((a, i) => {
        const lq = current.lq[i + 1] ?? null;
        const workers = current.workers[i + 1] ?? null;
        const certain =
          current.code !== UNCLASSIFIED_GEO &&
          lq !== null &&
          workers !== null &&
          workers >= MIN_WORKERS &&
          Math.abs(lq - 1) >= 0.05;
        return { code: a.code, label: a.label, lq, workers, certain };
      }),
    [prefectures, current],
  );

  const ranked = useMemo(
    () =>
      tiles
        .filter((t): t is Tile & { lq: number } => t.lq !== null)
        .sort((a, b) => b.lq - a.lq),
    [tiles],
  );

  const rankOf = useMemo(
    () => new Map(ranked.map((t, i) => [t.code, i + 1])),
    [ranked],
  );

  const areaIndex = area === "" ? -1 : areas.findIndex((a) => a.code === area);
  const pinnedTile = areaIndex < 1 ? undefined : tiles.find((t) => t.code === area);

  const standout = useMemo(() => {
    const empty = {
      high: [] as StandoutRow[],
      low: [] as StandoutRow[],
      moreHigh: 0,
      moreLow: 0,
    };
    if (areaIndex < 1) return empty;

    const mid = rows
      .filter((r) => r.code !== TOTAL_OCC_GEO && r.code !== UNCLASSIFIED_GEO)
      .flatMap((r) => {
        const lq = r.lq[areaIndex] ?? null;
        const workers = r.workers[areaIndex] ?? null;
        if (lq === null || workers === null || workers < MIN_WORKERS) return [];
        if (Math.abs(lq - 1) < 0.08) return [];
        return [{ code: r.code, label: r.label, workers, lq } satisfies StandoutRow];
      });

    const highAll = mid.filter((r) => r.lq > 1).sort((a, b) => b.lq - a.lq);
    const lowAll = mid.filter((r) => r.lq < 1).sort((a, b) => a.lq - b.lq);
    return {
      high: highAll.slice(0, STANDOUT),
      low: lowAll.slice(0, STANDOUT),
      moreHigh: Math.max(0, highAll.length - STANDOUT),
      moreLow: Math.max(0, lowAll.length - STANDOUT),
    };
  }, [areaIndex, rows]);

  const focusCode = hovered ?? (area === "" ? null : area);
  const focus = focusCode === null ? undefined : tiles.find((t) => t.code === focusCode);

  return (
    <div className="mx-auto flex w-full max-w-[1240px] gap-8 px-6 py-6 max-lg:flex-col-reverse">
      <aside className="w-[300px] shrink-0 max-lg:w-full lg:sticky lg:top-6 lg:flex lg:max-h-[calc(100dvh-3rem)] lg:flex-col lg:self-start">
        <h2 className="flex items-baseline justify-between px-2 pb-1 text-[11px] font-semibold tracking-wide text-faint">
          <span>
            職業大分類 <span className="font-normal">{picker.length}項目</span>
          </span>
          <span className="font-normal">全国の就業者</span>
        </h2>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <OccPicker rows={picker} selected={current.code} onSelect={setOcc} />
        </div>
        <p className="mt-2 border-t border-rule px-2 pt-2 text-[10.5px] leading-relaxed text-faint">
          多い順。分類不能は一覧に出すが、地図では強調しない。
        </p>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="flex flex-wrap items-baseline justify-between gap-3 pb-4">
          <div className="flex min-w-0 items-baseline gap-3">
            <h1 className="truncate text-[19px] font-semibold tracking-tight">
              {current.label}
            </h1>
            <p className="tnum shrink-0 text-[13px] text-muted">
              全国 {int.format(current.workers[0] ?? 0)}人
            </p>
          </div>
          <div className="flex items-center gap-2">
            <YearSelect years={years} value={year} onChange={setYear} />
            <Segmented options={SEXES} value={sex} onChange={setSex} label="性別" />
          </div>
        </header>

        <p className="tnum min-h-9 pb-4 text-[12.5px]">
          {focus !== undefined ? (
            <>
              <span className="font-semibold">{focus.label}</span>
              <span className="text-muted">
                {focus.workers !== null && ` ${int.format(focus.workers)}人`}
                {focus.lq === null
                  ? " データなし"
                  : ` · 全国の${one.format(focus.lq)}倍 · ${ranked.length}県中${rankOf.get(focus.code)}位`}
              </span>
            </>
          ) : (
            <Headline ranked={ranked} workers={current.workers[0] ?? 0} />
          )}
        </p>

        <TileMap
          tiles={tiles}
          hovered={hovered}
          onHover={setHovered}
          pinned={area === "" ? null : area}
          onPin={(code) => setArea(code ?? "")}
        />

        {pinnedTile !== undefined && (
          <AreaOccs
            areaLabel={pinnedTile.label}
            high={standout.high}
            low={standout.low}
            moreHigh={standout.moreHigh}
            moreLow={standout.moreLow}
            selected={current.code}
            onSelect={setOcc}
            onClear={() => setArea("")}
          />
        )}

        <p className="mt-5 border-t border-rule pt-3 text-[11px] leading-relaxed text-muted">
          数値は立地係数 LQ。県の当該職種構成比を全国の構成比で割った値。全国が1。年齢構成は国勢の時系列表に無いため、年齢調整はしていない。2015年・2020年は不詳補完値。
        </p>
        <p className="mt-2 text-[11px] leading-relaxed text-faint">
          地図は模式図。色の尺度は全職種で共通（全国の1/1.5〜1.5倍）。労働力調査（時代・年齢）とは母集団が違うため、人数を横断比較しない。
        </p>
      </main>
    </div>
  );
}
