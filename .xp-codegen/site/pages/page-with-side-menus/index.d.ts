// WARNING: This file was automatically generated by "no.item.xp.codegen". You may lose your changes if you edit it.
export type PageWithSideMenus = {
  /**
   * Vis denne menyen
   */
  leftMenuToggle: boolean;

  /**
   * Vis intern-navigasjon
   */
  showInternalNav: boolean;

  /**
   * Sticky-meny
   */
  leftMenuSticky: boolean;

  /**
   * Tittel
   */
  leftMenuHeader?: string;

  /**
   * Overstyr lenketekster
   */
  anchorLinks?: Array<{
    /**
     * Anker-id
     */
    anchorId: string;

    /**
     * Lenketekst
     */
    linkText: string;
  }>;

  /**
   * Vis denne menyen
   */
  rightMenuToggle: boolean;

  /**
   * Sticky-meny
   */
  rightMenuSticky: boolean;

  /**
   * H1 header for siden
   */
  title?: string;
}
