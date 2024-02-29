// WARNING: This file was automatically generated by "no.item.xp.codegen". You may lose your changes if you edit it.
export interface SectionWithHeaderConfig {
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
   * Toggle "kopier lenke" knapp
   */
  toggleCopyButton: boolean;

  /**
   * Visninger
   */
  displays?:
    | {
        /**
         * Selected
         */
        _selected: "alternativeAudience";

        /**
         * Aktuelle målgrupper
         */
        alternativeAudience: {
          /**
           * Overstyr tittel
           */
          title?: string;

          /**
           * Introduksjon (1-2 linjer)
           */
          description?: string;
        };
      }
    | {
        /**
         * Selected
         */
        _selected: "relatedSituations";

        /**
         * Aktuelle situasjoner
         */
        relatedSituations: {
          /**
           * Overstyr tittel
           */
          title?: string;

          /**
           * Introduksjon (1-2 linjer)
           */
          description?: string;
        };
      };

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
}
