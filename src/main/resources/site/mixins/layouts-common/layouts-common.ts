// WARNING: This file was automatically generated by "no.item.xp.codegen". You may lose your changes if you edit it.
export interface LayoutsCommon {
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
           * Topp-padding
           */
          top?: number;

          /**
           * Bunn-padding
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
