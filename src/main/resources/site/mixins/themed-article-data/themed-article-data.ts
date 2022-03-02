// WARNING: This file was automatically generated by "no.item.xp.codegen". You may lose your changes if you edit it.
export interface ThemedArticleData {
  /**
   * Sett side-tittel
   */
  title?: string;

  /**
   * Norsk tittel (hvis fremmedspråklig innhold)
   */
  norwegianTitle?: string;

  /**
   * Ingress
   */
  ingress?: string;

  /**
   * Målgruppe
   */
  audience: "person" | "employer" | "provider";

  /**
   * Kategori
   */
  taxonomy?: Array<"benefits" | "followup" | "rights" | "measures" | "for_employers" | "for_providers">;

  /**
   * Tilleggskategori
   */
  customCategory?: string;

  /**
   * Områdekategori
   */
  area?: Array<"work" | "family" | "health" | "accessibility" | "pension" | "social_counselling">;

  /**
   * Velg piktogram
   */
  illustration?: string;
}
