// WARNING: This file was automatically generated by "no.item.xp.codegen". You may lose your changes if you edit it.
export interface SectionPage {
  /**
   * Ingress
   */
  ingress?: string;

  /**
   * Oppgi antall tavler/bokser på seksjonssiden
   */
  nrTableEntries?: number;

  /**
   * Velg innhold
   */
  tableContents?: Array<string>;

  /**
   * Overskrift over lenkepanelene
   */
  panelsHeading?: string;

  /**
   * Klikkbart lenkepanel
   */
  panelItems?: Array<{
    /**
     * Paneltittel
     */
    title: string;

    /**
     * Panelbeskrivelse
     */
    ingress?: string;

    /**
     * Heldekkende panel
     */
    spanning: boolean;

    /**
     * Peker til innhold
     */
    url: {
      /**
       * URL til lenke
       */
      text?: string;

      /**
       * ELLER - Velg innhold
       */
      ref?: string;
    };
  }>;

  /**
   * Hvor mange elementer i undermenyene er tillatt
   */
  nrNews?: number;

  /**
   * Velg innhold
   */
  newsContents?: string;

  /**
   * Url til flere nyheter
   */
  moreNewsUrl?: string;

  /**
   * Hvor mange elementer i undermenyene er tillatt
   */
  nrNTK?: number;

  /**
   * Velg innhold
   */
  ntkContents?: string;

  /**
   * Hvor mange elementer i undermenyene er tillatt
   */
  nrSC?: number;

  /**
   * Velg innhold
   */
  scContents?: string;

  /**
   * Velg innhold
   */
  breaking_news?: Array<string>;

  /**
   * Legg til andre språkversjoner
   */
  languages?: Array<string>;

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
   * Skal ikke vises i eksternt søk - NB! Skal bare legges inn av hovedredaktør/administrator
   */
  noindex: boolean;

  /**
   * Nøkkelord (internt søk)
   */
  keywords?: string;
}
