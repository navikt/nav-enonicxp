// WARNING: This file was automatically generated by "no.item.xp.codegen". You may lose your changes if you edit it.
export interface FormDetails {
  /**
   * Skjemanummer
   */
  formNumbers?: Array<string>;

  /**
   * Tittel
   */
  title?: string;

  /**
   * Ingress
   */
  ingress?: string;

  /**
   * Variasjoner
   */
  formType: Array<
    | {
        /**
         * Selected
         */
        _selected: "application";

        /**
         * Søknad / skjema
         */
        application: {

          variations?: Array<{
            /**
             * Knappetekst
             */
            label?: string;

            /**
             * URL til skjema
             */
            url?: string;
          }>;
        };
      }
    | {
        /**
         * Selected
         */
        _selected: "complaint";

        /**
         * Klage- og ankevariasjoner
         */
        complaint: {
          /**
           * Klage- og ankevariasjoner
           */
          variations?: Array<{
            /**
             * Knappetekst
             */
            label?: string;

            /**
             * URL til skjema
             */
            url?: string;

            /**
             * Klage- eller anketype
             */
            type: "complaint" | "appeal";
          }>;
        };
      }
    | {
        /**
         * Selected
         */
        _selected: "addendum";

        /**
         * Ettersendelse
         */
        addendum: {

          variations?: Array<{
            /**
             * Knappetekst
             */
            label?: string;

            /**
             * URL til skjema
             */
            url?: string;
          }>;
        };
      }
  >;
}
