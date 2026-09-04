/**
 * 生データから配信用 cube を組み立てて public/data/ に書き出す。
 *
 *   npm run data
 */

import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { loadTable, type Table } from "../src/lib/transform/table.ts";
import { Cube, round } from "../src/lib/transform/cube.ts";
import { formatBytes } from "../src/lib/cache.ts";
import { SEX_LABEL_LFS, type Sex } from "../src/lib/data/labels.ts";
import type { DictEntry } from "../src/app/data/cube.ts";

const OUT_DIR = resolve(import.meta.dirname, "../public/data");

const SEXES = ["total", "male", "female"] as const satisfies readonly Sex[];

const SEX_CENSUS = {
  total: "総数",
  male: "男",
  female: "女",
} as const;

/** 年齢ビューに載せる5歳階級（合算行を除く）。 */
const AGE_BAND_CODES = [
  "02", // 15～19
  "05", // 20～24
  "07", // 25～29
  "08", // 30～34
  "10", // 35～39
  "11", // 40～44
  "13", // 45～49
  "14", // 50～54
  "16", // 55～59
  "17", // 60～64
  "19", // 65～69
  "28", // 70～74
  "29", // 75歳以上
] as const;

/** 国勢の調査年。2015/2020は不詳補完値を使う。 */
const GEO_YEARS = [
  { year: "2005", timeCode: "2005000000" },
  { year: "2010", timeCode: "2010000000" },
  { year: "2015", timeCode: "2015000010" },
  { year: "2020", timeCode: "2020000010" },
] as const;

function yearOf(name: string): string {
  const m = /^(\d{4})年/.exec(name);
  if (m === null) throw new Error(`年として読めない: ${name}`);
  return m[1]!;
}

function dictOf(
  items: { "@code": string; "@name": string; "@level": string; "@parentCode"?: string }[],
): DictEntry[] {
  return items.map((c) => ({
    code: c["@code"],
    label: c["@name"],
    level: Number(c["@level"] || 1),
    ...(c["@parentCode"] !== undefined ? { parent: c["@parentCode"] } : {}),
  }));
}

/** 「Ａ管理的職業従事者」→「管理的職業従事者」 */
function stripOccPrefix(name: string): string {
  return name.replace(/^[Ａ-ＬA-L]/, "").trim();
}

function shortAgeLabel(name: string): string {
  return name.replace(/歳$/, "").replace(/～/g, "–");
}

async function writeJson(name: string, data: unknown): Promise<void> {
  const json = JSON.stringify(data);
  const path = resolve(OUT_DIR, `${name}.json`);
  await writeFile(path, json);
  console.log(`  ${name}.json  ${formatBytes(Buffer.byteLength(json))}`);
}

function shareOf(part: number | null, total: number | null): number | null {
  if (part === null || total === null || total === 0) return null;
  return round(part / total, 4);
}

/** 労働力調査の職業辞書。総数を先頭、表の並びのまま。 */
function lfsOccupations(t: Table): DictEntry[] {
  const axis = t.axis("職業");
  return dictOf(axis.items).map((d) =>
    d.code === "000" ? { ...d, label: "総数（すべての職業）" } : d,
  );
}

async function buildEra() {
  const t = await loadTable("occ-age");
  const occupations = lfsOccupations(t);
  const years = [...t.axis("時間軸").items]
    .map((c) => ({ code: c["@code"], year: yearOf(c["@name"]) }))
    .sort((a, b) => a.year.localeCompare(b.year));
  const ageAll = t.codeOf("年齢階級", "15歳以上");
  const tab = t.axis("表章項目").items[0]!["@code"];

  const cube = new Cube(
    [
      { name: "occ", codes: occupations.map((d) => d.code) },
      { name: "sex", codes: [...SEXES] },
      { name: "year", codes: years.map((y) => y.year) },
    ],
    ["workers", "share"],
  );

  for (const occ of occupations) {
    for (const sex of SEXES) {
      for (const y of years) {
        const workers = t.get({
          表章項目: tab,
          職業: occ.code,
          性別: t.codeOf("性別", SEX_LABEL_LFS[sex]),
          年齢階級: ageAll,
          地域: "00000",
          時間軸: y.code,
        });
        const total = t.get({
          表章項目: tab,
          職業: "000",
          性別: t.codeOf("性別", SEX_LABEL_LFS[sex]),
          年齢階級: ageAll,
          地域: "00000",
          時間軸: y.code,
        });
        cube.set("workers", [occ.code, sex, y.year], workers);
        cube.set("share", [occ.code, sex, y.year], shareOf(workers, total));
      }
    }
  }

  await writeJson("era", { ...cube.toJSON(), occupations });
}

async function buildOccAge() {
  const t = await loadTable("occ-age");
  const occupations = lfsOccupations(t);
  const ageAxis = t.axis("年齢階級");
  const ages = AGE_BAND_CODES.map((code) => {
    const item = ageAxis.byCode.get(code);
    if (item === undefined) throw new Error(`年齢コード ${code} がない`);
    return {
      code,
      label: shortAgeLabel(item["@name"]),
      level: Number(item["@level"] || 1),
    } satisfies DictEntry;
  });
  const years = [...t.axis("時間軸").items]
    .map((c) => ({ code: c["@code"], year: yearOf(c["@name"]) }))
    .sort((a, b) => a.year.localeCompare(b.year));
  const tab = t.axis("表章項目").items[0]!["@code"];

  const cube = new Cube(
    [
      { name: "occ", codes: occupations.map((d) => d.code) },
      { name: "age", codes: ages.map((d) => d.code) },
      { name: "sex", codes: [...SEXES] },
      { name: "year", codes: years.map((y) => y.year) },
    ],
    ["workers", "share"],
  );

  for (const occ of occupations) {
    for (const age of ages) {
      for (const sex of SEXES) {
        for (const y of years) {
          const workers = t.get({
            表章項目: tab,
            職業: occ.code,
            性別: t.codeOf("性別", SEX_LABEL_LFS[sex]),
            年齢階級: age.code,
            地域: "00000",
            時間軸: y.code,
          });
          const total = t.get({
            表章項目: tab,
            職業: "000",
            性別: t.codeOf("性別", SEX_LABEL_LFS[sex]),
            年齢階級: age.code,
            地域: "00000",
            時間軸: y.code,
          });
          cube.set("workers", [occ.code, age.code, sex, y.year], workers);
          cube.set("share", [occ.code, age.code, sex, y.year], shareOf(workers, total));
        }
      }
    }
  }

  await writeJson("occ-age", { ...cube.toJSON(), occupations, ages });
}

async function buildGeo() {
  const t = await loadTable("occ-geo");
  const occAxis = t.axis("職業大分類");
  const occupations: DictEntry[] = occAxis.items.map((c) => ({
    code: c["@code"],
    label: c["@code"] === "100" ? "総数（すべての職業）" : stripOccPrefix(c["@name"]),
    level: Number(c["@level"] || 1),
    ...(c["@parentCode"] !== undefined ? { parent: c["@parentCode"] } : {}),
  }));

  const prefectures = [...t.axis("地域").items].map((c) => ({
    code: c["@code"],
    label: c["@name"],
    level: Number(c["@level"] || 1),
  }));
  // 先頭に全国を合成。LQ の分母・検証用。
  const areas: DictEntry[] = [
    { code: "00000", label: "全国", level: 1 },
    ...prefectures,
  ];

  const years = GEO_YEARS.map((y) => y.year);
  const tabWorkers = t.codeOf("表章項目", "就業者数");

  const cube = new Cube(
    [
      { name: "occ", codes: occupations.map((d) => d.code) },
      { name: "sex", codes: [...SEXES] },
      { name: "year", codes: [...years] },
      { name: "area", codes: areas.map((d) => d.code) },
    ],
    ["workers", "share", "lq"],
  );

  for (const occ of occupations) {
    for (const sex of SEXES) {
      for (const gy of GEO_YEARS) {
        const sexCode = t.codeOf("男女", SEX_CENSUS[sex]);
        const byArea: (number | null)[] = [];
        let national = 0;
        let nationalMissing = 0;

        for (const pref of prefectures) {
          const v = t.get({
            表章項目: tabWorkers,
            職業大分類: occ.code,
            男女: sexCode,
            地域: pref.code,
            時間軸: gy.timeCode,
          });
          byArea.push(v);
          if (v === null) nationalMissing += 1;
          else national += v;
        }

        const nationalValue = nationalMissing === prefectures.length ? null : national;
        const workersRow = [nationalValue, ...byArea];

        // 構成比の分母は職業「総数」の就業者数。
        const totalByArea: (number | null)[] = [];
        let totalNational = 0;
        let totalMissing = 0;
        for (const pref of prefectures) {
          const v = t.get({
            表章項目: tabWorkers,
            職業大分類: "100",
            男女: sexCode,
            地域: pref.code,
            時間軸: gy.timeCode,
          });
          totalByArea.push(v);
          if (v === null) totalMissing += 1;
          else totalNational += v;
        }
        const totalNationalValue = totalMissing === prefectures.length ? null : totalNational;
        const totals = [totalNationalValue, ...totalByArea];

        const nationalShare = shareOf(nationalValue, totalNationalValue);

        for (let i = 0; i < areas.length; i++) {
          const workers = workersRow[i] ?? null;
          const total = totals[i] ?? null;
          const share = shareOf(workers, total);
          const lq =
            i === 0
              ? nationalShare === null
                ? null
                : 1
              : share === null || nationalShare === null || nationalShare === 0
                ? null
                : round(share / nationalShare, 4);

          cube.set("workers", [occ.code, sex, gy.year, areas[i]!.code], workers);
          cube.set("share", [occ.code, sex, gy.year, areas[i]!.code], share);
          cube.set("lq", [occ.code, sex, gy.year, areas[i]!.code], lq);
        }
      }
    }
  }

  await writeJson("geo", { ...cube.toJSON(), occupations, areas });
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  console.log("build era");
  await buildEra();
  console.log("build occ-age");
  await buildOccAge();
  console.log("build geo");
  await buildGeo();
  console.log("done");
}

await main();
