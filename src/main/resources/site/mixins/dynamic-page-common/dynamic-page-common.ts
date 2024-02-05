// WARNING: This file was automatically generated by "no.item.xp.codegen". You may lose your changes if you edit it.
export interface DynamicPageCommon {
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
   * Vis intern navigasjon i innholdsseksjoner
   */
  showSubsectionNavigation: boolean;

  /**
   * Oppsummering
   */
  description?: string;

  /**
   * Nøkkelord (internt søk)
   */
  keywords?: Array<string>;

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
   * Ikke vis utdrag (snippets) i Google-søk
   */
  nosnippet: boolean;
}
