// WARNING: This file was automatically generated by "no.item.xp.codegen". You may lose your changes if you edit it.
export type DynamicLinkPanel = {

  link:
    | {
        /**
         * Selected
         */
        _selected: "internal";

        /**
         * Intern lenke
         */
        internal: {
          /**
           * Innhold det skal lenkes til
           */
          target: string;

          /**
           * Lenketekst (hvis tom vil tittel på innholdet vises)
           */
          text?: string;
        };
      }
    | {
        /**
         * Selected
         */
        _selected: "external";

        /**
         * Ekstern lenke
         */
        external: {
          /**
           * URL
           */
          url: string;

          /**
           * Lenketekst
           */
          text: string;
        };
      };

  /**
   * Ingress
   */
  ingress?: string;

  /**
   * Velg ikon
   */
  icon?: string;

  /**
   * Bakgrunnsbilde (valgfritt)
   */
  background?: string;

  /**
   * Varianter
   */
  variant?:
    | {
        /**
         * Selected
         */
        _selected: "vertical";

        /**
         * Standard vertikalt layout
         */
        vertical: Record<string, unknown>;
      }
    | {
        /**
         * Selected
         */
        _selected: "verticalWithBgColor";

        /**
         * Vertikalt med stort ikon og bakgrunnsfarge
         */
        verticalWithBgColor: {
          /**
           * Bakgrunnsfarge
           */
          iconBg?: {
            /**
             * Velg farge
             */
            color: string;
          };

          /**
           * Posisjon på ikonet
           */
          iconJustify: "flex-start" | "center" | "flex-end";
        };
      };

  /**
   * Velg visning
   */
  renderOnAuthState: "always" | "loggedIn" | "loggedOut";
};
