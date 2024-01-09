// WARNING: This file was automatically generated by "no.item.xp.codegen". You may lose your changes if you edit it.
export interface PublishingCalendar {
  /**
   * Ingress
   */
  ingress?: string;

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
   * Ikke vis utdrag (snippets)
   */
  nosnippets: boolean;

  /**
   * Nøkkelord (internt søk)
   */
  keywords?: Array<string>;
}
