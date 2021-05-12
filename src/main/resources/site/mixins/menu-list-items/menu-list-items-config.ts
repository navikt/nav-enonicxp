// WARNING: This file was automatically generated by "no.item.xp.codegen". You may lose your changes if you edit it.
export interface MenuListItemsConfig {
  /**
   * Innhold i høyremenyen
   */
  menuListItems?: {
    /**
     * Selected
     */
    _selected: Array<"selfservice" | "form-and-application" | "process-times" | "related-information" | "international" | "report-changes" | "rates" | "appeal-rights" | "membership" | "rules-and-regulations">;
    
    /**
     * Logg inn
     */
    selfservice: {
      /**
       * Logg inn
       */
      link?: Array<string>;
    };
    
    /**
     * Skjema og søknad
     */
    'form-and-application': {
      /**
       * Skjema og søknad
       */
      link?: Array<string>;
    };
    
    /**
     * Saksbehandlingstider
     */
    'process-times': {
      /**
       * Saksbehandlingstider
       */
      link?: Array<string>;
    };
    
    /**
     * Relatert informasjon
     */
    'related-information': {
      /**
       * Innhold
       */
      link?: Array<string>;

      /**
       * Legg ved filer
       */
      files?: Array<string>;
    };
    
    /**
     * Internasjonalt
     */
    international: {
      /**
       * Internasjonalt
       */
      link?: Array<string>;
    };
    
    /**
     * Meld fra om endringer
     */
    'report-changes': {
      /**
       * Meld fra om endringer
       */
      link?: Array<string>;
    };
    
    /**
     * Satser
     */
    rates: {
      /**
       * Satser
       */
      link?: Array<string>;
    };
    
    /**
     * Klagerettigheter
     */
    'appeal-rights': {
      /**
       * Klagerettigheter
       */
      link?: Array<string>;
    };
    
    /**
     * Medlemskap i folketrygden
     */
    membership: {
      /**
       * Medlemskap i folketrygden
       */
      link?: Array<string>;
    };
    
    /**
     * Regelverk
     */
    'rules-and-regulations': {
      /**
       * Regelverk
       */
      link?: Array<string>;
    };
  };
}
