// WARNING: This file was automatically generated by "no.item.xp.codegen". You may lose your changes if you edit it.
export interface GuideData {
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
  ingress: string;

  /**
   * Målgruppe
   */
  audience: "person" | "employer" | "provider" | "self_employed";

  /**
   * Områdekategori
   */
  area: Array<"work" | "family" | "health" | "accessibility" | "pension" | "social_counselling" | "municipality" | "self_employed" | "other">;

  /**
   * Velg piktogram
   */
  illustration: string;

  /**
   * Videresend alle besøk til annen url:
   */
  externalProductUrl?: string;

  /**
   * Skriv inn ønsket url
   */
  customPath: string;
}
