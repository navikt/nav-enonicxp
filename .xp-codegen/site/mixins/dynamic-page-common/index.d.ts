// WARNING: This file was automatically generated by "no.item.xp.codegen". You may lose your changes if you edit it.
export type DynamicPageCommon = {
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
   * Oppsummering
   */
  description?: string;

  /**
   * Nøkkelord (internt søk)
   */
  keywords?: Array<string> | string;

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
};
