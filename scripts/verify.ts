/**
 * 配信 cube の健全性チェック。
 *
 *   npm run verify
 */

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { CubeView, type CubeJson, type DictEntry } from "../src/app/data/cube.ts";

const DATA = resolve(import.meta.dirname, "../public/data");

let failed = 0;

function ok(label: string, cond: boolean, detail = ""): void {
  console.log(`${cond ? "OK" : "NG"}  ${label}${detail ? `: ${detail}` : ""}`);
  if (!cond) failed += 1;
}

function near(a: number, b: number, tol: number): boolean {
  return Math.abs(a - b) <= tol;
}

interface EraFile extends CubeJson {
  occupations: DictEntry[];
}

interface AgeFile extends CubeJson {
  occupations: DictEntry[];
  ages: DictEntry[];
}

interface GeoFile extends CubeJson {
  occupations: DictEntry[];
  areas: DictEntry[];
}

const eraRaw = JSON.parse(await readFile(resolve(DATA, "era.json"), "utf8")) as EraFile;
const ageRaw = JSON.parse(await readFile(resolve(DATA, "occ-age.json"), "utf8")) as AgeFile;
const geoRaw = JSON.parse(await readFile(resolve(DATA, "geo.json"), "utf8")) as GeoFile;

const era = new CubeView(eraRaw);
const age = new CubeView(ageRaw);
const geo = new CubeView(geoRaw);

// --- 時代: 総数の就業者数が妥当な規模（万人）
const eraTotal2024 = era.at("workers", { occ: "000", sex: "total", year: "2024" });
ok(
  "era 2024 総数（万人）",
  eraTotal2024 !== null && eraTotal2024 > 5000 && eraTotal2024 < 8000,
  String(eraTotal2024),
);
ok(
  "era 総数の share=1",
  era.at("share", { occ: "000", sex: "total", year: "2024" }) === 1,
  String(era.at("share", { occ: "000", sex: "total", year: "2024" })),
);

// --- 年齢: 15–19 の総数 ≈ 時代の一部より小さい、葉の合計 ≈ 総数
const ageTotal = age.at("workers", {
  occ: "000",
  age: "05",
  sex: "total",
  year: "2024",
});
ok("occ-age 20–24 総数がある", ageTotal !== null && ageTotal > 0, String(ageTotal));

// 大分類の合計 ≈ 総数。万人丸めと分類不能相当の残差で数万人ずれる。
const majors = ageRaw.occupations.filter((o) => o.code !== "000" && o.level === 1);
const majorSum = majors.reduce((n, o) => {
  const v = age.at("workers", { occ: o.code, age: "05", sex: "total", year: "2024" });
  return n + (v ?? 0);
}, 0);
ok(
  "occ-age 大分類合計 ≈ 総数（20–24, 2024）",
  ageTotal !== null && near(majorSum, ageTotal, 15),
  `大分類=${majorSum} 総数=${ageTotal}`,
);

// --- 地域: 全国 LQ=1、県合計=全国
for (const year of ["2005", "2010", "2015", "2020"]) {
  const lq = geo.at("lq", { occ: "100", sex: "total", year, area: "00000" });
  ok(`geo ${year} 全国 LQ(総数)=1`, lq === 1, String(lq));

  const national = geo.at("workers", { occ: "110", sex: "total", year, area: "00000" });
  const prefs = geoRaw.areas.slice(1);
  const sum = prefs.reduce((n, a) => {
    const v = geo.at("workers", { occ: "110", sex: "total", year, area: a.code });
    return n + (v ?? 0);
  }, 0);
  ok(
    `geo ${year} 管理的職業 県合計=全国`,
    national !== null && near(sum, national, 1),
    `全国=${national} 合計=${sum}`,
  );

  // 職業 A の全国 LQ
  const lqA = geo.at("lq", { occ: "110", sex: "total", year, area: "00000" });
  ok(`geo ${year} 全国 LQ(管理的)=1`, lqA === 1, String(lqA));
}

if (failed > 0) {
  console.error(`\n${failed} 件不一致`);
  process.exit(1);
}
console.log("\n検証 OK");
