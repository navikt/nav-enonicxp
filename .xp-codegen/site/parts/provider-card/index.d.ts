// WARNING: This file was automatically generated by "no.item.xp.codegen". You may lose your changes if you edit it.
export type ProviderCard = {

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
   * Beskrivelse
   */
  description?: string;

  /**
   * Sluttnote / kategorinavn
   */
  endnote?: string;
};
