// WARNING: This file was automatically generated by "no.item.xp.codegen". You may lose your changes if you edit it.
export interface ThemedArticlePage {
  /**
   * Tilleggskategori
   */
  customCategory?: string;

  /**
   * Legg til andre språkversjoner
   */
  languages?: Array<string>;

  /**
   * Skriv inn ønsket url
   */
  customPath: string;

  /**
   * Fant du det du lette etter?
   */
  feedbackToggle: boolean;

  /**
   * Chatbot Frida
   */
  chatbotToggle: boolean;

  /**
   * Oppsummering
   */
  description?: string;

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
}
