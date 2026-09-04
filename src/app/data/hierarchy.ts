/**
 * 職業の階層ヘルパ。
 *
 * 労働力調査は大分類の下に中分類がある。ランキングでは葉だけを使い、
 * 大分類と中分類を同時に足して二重計上しない。
 */

import type { DictEntry } from "./cube.ts";

export const TOTAL_OCC_LFS = "000";
export const TOTAL_OCC_GEO = "100";
/** 国勢の分類不能。地図の強調から外す。 */
export const UNCLASSIFIED_GEO = "220";

/** 親コードを持つ項目の親集合。 */
function parentsOf(items: DictEntry[]): Set<string> {
  return new Set(items.filter((d) => d.parent !== undefined).map((d) => d.parent!));
}

/**
 * 非重複の選択単位。中分類がある大分類は中分類だけ、なければ大分類。
 * 総数は含めない。
 */
export function leafOccupations(items: DictEntry[], totalCode: string): DictEntry[] {
  const parents = parentsOf(items);
  return items.filter(
    (d) => d.code !== totalCode && (d.parent !== undefined || !parents.has(d.code)),
  );
}

/** リスト用。総数を除き、表の並びのまま（大分類→中分類）。 */
export function listOccupations(items: DictEntry[], totalCode: string): DictEntry[] {
  return items.filter((d) => d.code !== totalCode);
}
