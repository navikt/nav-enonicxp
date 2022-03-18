// WARNING: This file was automatically generated by "no.item.xp.codegen". You may lose your changes if you edit it.
export interface ProductData {
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
  taxonomy?: Array<"assistive_tools" | "followup" | "benefits" | "measures" | "rights" | "for_employers" | "for_providers">;

  /**
   * Områdekategori
   */
  area?: Array<"work" | "family" | "health" | "accessibility" | "pension" | "social_counselling">;

  /**
   * Velg piktogram
   */
  illustration?: string;

  /**
   * Videresend alle besøk til annen url:
   */
  externalProductUrl?: string;
}
