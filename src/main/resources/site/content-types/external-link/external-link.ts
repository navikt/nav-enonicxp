// WARNING: This file was automatically generated by "no.item.xp.codegen". You may lose your changes if you edit it.
export interface ExternalLink {
  /**
   * Ingress
   */
  description?: string;

  /**
   * URL
   */
  url: string;

  /**
   * Permanent redirect (innhold flyttet til ny url)
   */
  permanentRedirect: boolean;

  /**
   * Skriv inn ønsket kort-url
   */
  customPath?: string;

  /**
   * Nøkkelord (internt søk)
   */
  keywords?: Array<string>;
}
