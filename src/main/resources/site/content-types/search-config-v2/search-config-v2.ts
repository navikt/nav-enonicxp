// WARNING: This file was automatically generated by "no.item.xp.codegen". You may lose your changes if you edit it.
export interface SearchConfigV2 {
  /**
   * Standard-felter
   */
  defaultKeys: {
    /**
     * Felter for tittel
     */
    titleKey: Array<string>;

    /**
     * Felter for ingress
     */
    ingressKey?: Array<string>;

    /**
     * Felter for innhold
     */
    textKey?: Array<string>;
  };

  /**
   * Oppsett for innholdstyper
   */
  contentGroups?: Array<{
    /**
     * Navn på denne gruppen
     */
    name?: string;

    /**
     * Velg innholdstyper for denne gruppen
     */
    contentTypes: Array<string>;

    /**
     * Oppsett av felter (overstyrer standard-oppsett)
     */
    groupKeys?: {
      /**
       * Felter for tittel
       */
      titleKey?: Array<string>;

      /**
       * Felter for ingress
       */
      ingressKey?: Array<string>;

      /**
       * Felter for innhold
       */
      textKey?: Array<string>;
    };
  }>;
}