// WARNING: This file was automatically generated by "no.item.xp.codegen". You may lose your changes if you edit it.
export type MainArticle = {
  /**
   * Norsk tittel (hvis fremmedspråklig innhold)
   */
  originaltitle?: string;

  /**
   * Ingress
   */
  ingress?: string;

  /**
   * Brødtekst
   */
  text: string;

  /**
   * Innholdstype
   */
  contentType: "news" | "pressRelease" | "lastingContent";

  /**
   * Gjelder saken statistikk, analyse eller forskning?
   */
  subContentType: "statistics" | "none";

  /**
   * Sett inn innholdsfortegnelse
   */
  hasTableOfContents?: "none" | "h3";

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
      link?: Array<string> | string;
    };
    
    /**
     * Skjema og søknad
     */
    "form-and-application": {
      /**
       * Skjema og søknad
       */
      link?: Array<string> | string;
    };
    
    /**
     * Saksbehandlingstider
     */
    "process-times": {
      /**
       * Saksbehandlingstider
       */
      link?: Array<string> | string;
    };
    
    /**
     * Relatert informasjon
     */
    "related-information": {
      /**
       * Innhold
       */
      link?: Array<string> | string;

      /**
       * Legg ved filer
       */
      files?: Array<string> | string;
    };
    
    /**
     * Internasjonalt
     */
    international: {
      /**
       * Internasjonalt
       */
      link?: Array<string> | string;
    };
    
    /**
     * Meld fra om endringer
     */
    "report-changes": {
      /**
       * Meld fra om endringer
       */
      link?: Array<string> | string;
    };
    
    /**
     * Satser
     */
    rates: {
      /**
       * Satser
       */
      link?: Array<string> | string;
    };
    
    /**
     * Klagerettigheter
     */
    "appeal-rights": {
      /**
       * Klagerettigheter
       */
      link?: Array<string> | string;
    };
    
    /**
     * Medlemskap i folketrygden
     */
    membership: {
      /**
       * Medlemskap i folketrygden
       */
      link?: Array<string> | string;
    };
    
    /**
     * Regelverk
     */
    "rules-and-regulations": {
      /**
       * Regelverk
       */
      link?: Array<string> | string;
    };
  };

  /**
   * Faktaboksen vises under brødteksten
   */
  fact?: string;

  /**
   * Bilde med beskrivelse
   */
  picture?: {
    /**
     * Bilde
     */
    target: string;

    /**
     * Velg bildestørrelse
     */
    size?: "100" | "70" | "40";

    /**
     * Bildetekst
     */
    caption: string;

    /**
     * Alternativ tekst
     */
    altText: string;
  };

  /**
   * Velg alle detaljer som skal brukes på denne siden
   */
  formDetailsTargets?: Array<string> | string;

  /**
   * Del på sosiale medier
   */
  social?: Array<"twitter" | "facebook" | "linkedin"> | "twitter" | "facebook" | "linkedin";

  /**
   * Legg til andre språkversjoner
   */
  languages?: Array<string> | string;

  /**
   * Fant du det du lette etter?
   */
  feedbackToggle: boolean;

  /**
   * Chatbot Frida
   */
  chatbotToggle: boolean;

  /**
   * Sidebeskrivelse for søk og sosiale medier
   */
  metaDescription?: string;

  /**
   * Canonical url - NB! Skal bare legges inn av hovedredaktør/administrator
   */
  canonicalUrl?: string;

  /**
   * Skal ikke vises i søk
   */
  noindex: boolean;

  /**
   * Ikke vis "tilfeldige" utdrag (snippets) i Google-søk
   */
  nosnippet: boolean;

  /**
   * Nøkkelord (internt søk)
   */
  keywords?: Array<string> | string;
};
