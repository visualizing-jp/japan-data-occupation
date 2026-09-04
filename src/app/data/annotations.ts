/** 時代ビューの注記・図中マーク。 */

export const MARKS = [
  {
    year: 2011,
    label: "東日本大震災",
    detail:
      "労働力調査は岩手・宮城・福島を除く全国で実施されたなど、調査上の影響がある。時系列の比較には注意。",
  },
] as const;

/** 帯注記。労働力調査のこの系列には欠落期間は無い。 */
export const SPANS: readonly {
  from: number;
  to: number;
  label: string;
  detail: string;
  kind: "missing" | "scope";
}[] = [];

export const NOTES = [
  {
    term: "職業分類",
    detail:
      "平成21年12月改定の日本標準職業分類による。この系列は2009年以降で接続している。",
  },
  {
    term: "単位",
    detail: "就業者数は万人。労働力調査の標本推計。",
  },
] as const;
