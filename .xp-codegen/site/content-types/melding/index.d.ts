// WARNING: This file was automatically generated by "no.item.xp.codegen". You may lose your changes if you edit it.
export type Melding = {
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
   * Vis kun på bestemte URL'er
   */
  urlscope?: {
    /**
     * URL
     */
    urls: Array<string> | string;
  };
};
