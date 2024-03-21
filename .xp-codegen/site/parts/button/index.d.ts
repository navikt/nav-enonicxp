// WARNING: This file was automatically generated by "no.item.xp.codegen". You may lose your changes if you edit it.
export type Button = {

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
   * Type
   */
  type: "standard" | "hoved" | "fare" | "flat";

  /**
   * Størrelse
   */
  size: "normal" | "small";

  /**
   * Full bredde
   */
  fullwidth: boolean;

  /**
   * Velg ikon
   */
  icon?: string;

  /**
   * Velg visning
   */
  renderOnAuthState: "always" | "loggedIn" | "loggedOut";
}