// WARNING: This file was automatically generated by "no.item.xp.codegen". You may lose your changes if you edit it.
export interface FrontpageNewsPartConfig {
  /**
   * Tittel
   */
  title?: string;

  /**
   * Velg maks 2 nyhetsartikler
   */
  newsList?: Array<string>;

  /**
   * Flere nyheter
   */
  moreNews?: {
    /**
     * Lenke
     */
    url: string;

    /**
     * Lenketekst
     */
    text: string;
  };
}
