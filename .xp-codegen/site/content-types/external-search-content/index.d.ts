// WARNING: This file was automatically generated by "no.item.xp.codegen". You may lose your changes if you edit it.
export type ExternalSearchContent = {
  /**
   * Nøkkelord
   */
  keywords?: Array<string> | string;

  /**
   * URL
   */
  url: string;

  /**
   * Fritekst
   */
  text?: Array<string> | string;

  /**
   * Ingress
   */
  ingress: string;

  /**
   * Målgruppe
   */
  audience?: Array<"person" | "employer" | "provider"> | "person" | "employer" | "provider";
};
