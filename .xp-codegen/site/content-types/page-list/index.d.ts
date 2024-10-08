// WARNING: This file was automatically generated by "no.item.xp.codegen". You may lose your changes if you edit it.
export type PageList = {
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
  sectionContents?: Array<string> | string;

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
      link?: Array<string> | string;
    };
  };

  /**
   * Meta tagger
   */
  metaTags?: Array<string> | string;

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
