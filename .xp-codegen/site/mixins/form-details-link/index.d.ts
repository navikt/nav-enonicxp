// WARNING: This file was automatically generated by "no.item.xp.codegen". You may lose your changes if you edit it.
export type FormDetailsLink = {
  /**
   * Lenke til skjema
   */
  link:
    | {
        /**
         * Selected
         */
        _selected: "internal";

        /**
         * Intern lenke til skjema/mellomsteg
         */
        internal: {
          /**
           * Velg skjema eller mellomsteg
           */
          target: string;
        };
      }
    | {
        /**
         * Selected
         */
        _selected: "external";

        /**
         * Ekstern lenke til skjema
         */
        external: {
          /**
           * URL
           */
          url: string;
        };
      };
}
