export const SEX_LABEL = {
  total: "計",
  male: "男",
  female: "女",
} as const;

export type Sex = keyof typeof SEX_LABEL;

/** 労働力調査など「総数」表記の性別軸向け。 */
export const SEX_LABEL_LFS = {
  total: "総数",
  male: "男",
  female: "女",
} as const;
