// WARNING: This file was automatically generated by "no.item.xp.codegen". You may lose your changes if you edit it.
export interface Melding {
  /**
   * Type
   */
  type?: "prodstatus" | "info";

  /**
   * Ingress
   */
  ingress?: string;

  /**
   * Brødtekst melding
   */
  text?: string;

  /**
   * Vis kun på spesifikke URL'er
   */
  urlscope?: {
    /**
     * URL
     */
    urls: Array<string>;
  };
}
