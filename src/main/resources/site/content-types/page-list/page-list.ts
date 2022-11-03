// WARNING: This file was automatically generated by "no.item.xp.codegen". You may lose your changes if you edit it.
export interface PageList {
  /**
   * Orginaltittel
   */
  originaltitle?: string;

  /**
   * Ingress
   */
  ingress?: string;

  /**
   * Skjul dato på artikkellisten
   */
  hide_date: boolean;

  /**
   * Skjul dato på artiklene i artikkellisten
   */
  hideSectionContentsDate: boolean;

  /**
   * Sorter artikkellisten etter publiseringsdato
   */
  orderSectionContentsByPublished: boolean;

  /**
   * Contents
   */
  sectionContents?: Array<string>;

  /**
   * Innhold i høyremenyen
   */
  menuListItems?: {
    /**
     * Selected
     */
    _selected: Array<"shortcuts">;
    
    /**
     * Snarveier
     */
    shortcuts: {
      /**
       * Snarveier
       */
      link?: Array<string>;
    };
  };

  /**
   * Meta tagger
   */
  metaTags?: Array<string>;

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
   * Skal ikke vises i eksternt søk
   */
  noindex: boolean;

  /**
   * Nøkkelord (internt søk)
   */
  keywords?: Array<string>;
}
