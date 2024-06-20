// WARNING: This file was automatically generated by "no.item.xp.codegen". You may lose your changes if you edit it.
export type DynamicFlexCols = {
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
   * Antall kolonner ved full skjermbredde
   */
  numCols?: number;

  /**
   * Fullstendige rader
   */
  collapse: boolean;

  /**
   * Justering
   */
  justifyContent?: "flex-start" | "center" | "flex-end";

  /**
   * Topp-margin (rem-enheter)
   */
  marginTop?: number;

  /**
   * Bunn-margin (rem-enheter)
   */
  marginBottom?: number;

  /**
   * Horisontal padding
   */
  paddingSides:
    | {
        /**
         * Selected
         */
        _selected: "standard";

        /**
         * Standard
         */
        standard: Record<string, unknown>;
      }
    | {
        /**
         * Selected
         */
        _selected: "fullWidth";

        /**
         * Full skjermbredde
         */
        fullWidth: Record<string, unknown>;
      }
    | {
        /**
         * Selected
         */
        _selected: "custom";

        /**
         * Tilpasset
         */
        custom: {
          /**
           * (rem-enheter)
           */
          remValue?: number;
        };
      };

  /**
   * Vertikal padding
   */
  paddingTopBottom:
    | {
        /**
         * Selected
         */
        _selected: "standard";

        /**
         * Standard
         */
        standard: Record<string, unknown>;
      }
    | {
        /**
         * Selected
         */
        _selected: "custom";

        /**
         * Tilpasset (rem-enheter)
         */
        custom: {
          /**
           * Topp
           */
          top?: number;

          /**
           * Bunn
           */
          bottom?: number;
        };
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
   * Velg visning
   */
  renderOnAuthState: "always" | "loggedIn" | "loggedOut";
}
