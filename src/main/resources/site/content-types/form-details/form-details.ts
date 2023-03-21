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
   * Relasjon til andre skjemadetaljer
   */
  formDetailRelations?: Array<string>;

  /**
   * Variasjoner
   */
  formType:
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
            label: string;

            /**
             * URL til skjema
             */
            url: string;

            /**
             * Tittel
             */
            title?: string;

            /**
             * Ingress
             */
            ingress?: string;

            /**
             * Søknads- eller skjematype
             */
            type: "digital" | "paper";
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
            label: string;

            /**
             * URL til skjema
             */
            url: string;

            /**
             * Tittel
             */
            title?: string;

            /**
             * Ingress
             */
            ingress?: string;

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
          /**
           * Ettersendelsesvariasjoner
           */
          variations?: Array<{
            /**
             * Knappetekst
             */
            label: string;

            /**
             * URL til skjema
             */
            url: string;

            /**
             * Tittel
             */
            title?: string;

            /**
             * Ingress
             */
            ingress?: string;

            /**
             * Type ettersendelse
             */
            type: "addendum_digital" | "addendum_paper";
          }>;
        };
      };
}
