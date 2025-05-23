// WARNING: This file was automatically generated by "no.item.xp.codegen". You may lose your changes if you edit it.
export type SectionWithHeader = {
  /**
   * Tittel
   */
  title?: string;

  /**
   * Anker-id
   */
  anchorId?: string;

  /**
   * Ikke vis under innhold
   */
  hideFromInternalNavigation: boolean;

  /**
   * Ikon
   */
  icon?: {
    /**
     * Velg ikon
     */
    icon?: string;

    /**
     * Størrelse (%)
     */
    size?: number;

    /**
     * Velg farge
     */
    color: string;
  };

  /**
   * Bakgrunnsfarge
   */
  bgColor?: {
    /**
     * Velg farge
     */
    color: string;
  };

  /**
   * Omriss
   */
  border?: {
    /**
     * Velg farge
     */
    color: string;

    /**
     * Avrundede hjørner
     */
    rounded: boolean;

    /**
     * Tykkelse (px)
     */
    width?: number;
  };
};
