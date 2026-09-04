/**
 * 取得対象の e-Stat 統計表。
 * 各表の素性・注意点は docs/data-sources.md を参照。
 */

export interface DatasetDef {
  /** ファイル名やログに使う短いキー。 */
  key: string;
  /** e-Stat の統計表ID（getStatsData の statsDataId）。 */
  statsDataId: string;
  label: string;
  /** 公称セル数。取得後の健全性チェックに使う。 */
  expectedCells?: number;
  /** getStatsData への追加パラメータ。未指定なら全件取得。 */
  query?: Record<string, string>;
}

export const DATASETS = {
  /**
   * 労働力調査 年平均。年齢階級×職業大分類・中分類×性×年。
   * 時代ビューは年齢「15歳以上」、年齢ビューは5歳階級。
   */
  occAge: {
    key: "occ-age",
    statsDataId: "0003024269",
    label:
      "労働力調査 年平均 年齢階級，職業別就業者数（平成21年改定職業分類）",
  },

  /**
   * 国勢調査 時系列。職業大分類×性×都道府県×調査年。
   * 2015・2020は不詳補完値を優先。
   */
  occGeo: {
    key: "occ-geo",
    statsDataId: "0003410411",
    label: "国勢調査 時系列 職業大分類別就業者数（都道府県）",
  },
} as const satisfies Record<string, DatasetDef>;

export const ALL_DATASETS: DatasetDef[] = Object.values(DATASETS);

/** 配信用 cube の材料。 */
export const BUILD_DATASETS: DatasetDef[] = [DATASETS.occAge, DATASETS.occGeo];
