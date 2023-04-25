// WARNING: This file was automatically generated by "no.item.xp.codegen". You may lose your changes if you edit it.
export interface GuideData {
  /**
   * Sett side-tittel
   */
  title?: string;

  /**
   * Tittel for utlisting og sortering
   */
  sortTitle?: string;

  /**
   * Norsk tittel (hvis fremmedspråklig innhold)
   */
  norwegianTitle?: string;

  /**
   * Ikke vis denne siden i selve produktutlistingen
   */
  hideFromProductlist: boolean;

  /**
   * Ingress
   */
  ingress: string;

  /**
   * Målgruppe
   */
  audience: {
    /**
     * Selected
     */
    _selected: Array<"person" | "employer" | "provider">;
    
    /**
     * Privatperson
     */
    person: Record<string, unknown>;
    
    /**
     * Arbeidsgiver
     */
    employer: Record<string, unknown>;
    
    /**
     * Samarbeidspartner
     */
    provider: {
      /**
       * Underkategori
       */
      provider_audience: "doctor" | "other";
    };
  };

  /**
   * Områdekategori
   */
  area: Array<"work" | "family" | "health" | "accessibility" | "pension" | "social_counselling" | "municipality" | "other">;

  /**
   * Velg piktogram
   */
  illustration: string;

  /**
   * Videresend alle besøk til annen url:
   */
  externalProductUrl?: string;

  /**
   * Skriv inn ønsket kort-url
   */
  customPath: string;
}
