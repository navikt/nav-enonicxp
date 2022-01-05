// WARNING: This file was automatically generated by "no.item.xp.codegen". You may lose your changes if you edit it.
export interface Calculator {
  /**
   * Variabel
   */
  fields?: Array<
    | {
        /**
         * Selected
         */
        _selected: "inputField";

        /**
         * Nummerfelt
         */
        inputField: {
          /**
           * Tittel på felt
           */
          label?: string;

          /**
           * Forklaring
           */
          explanation?: string;

          /**
           * Javascript variabelnavn (skal normalt ikke endres)
           */
          variableName?: string;
        };
      }
    | {
        /**
         * Selected
         */
        _selected: "dropdownField";

        /**
         * Listevalg
         */
        dropdownField: {
          /**
           * Tittel på felt
           */
          label?: string;

          /**
           * Valg
           */
          optionItems: Array<{
            /**
             * Tittel
             */
            label?: string;

            /**
             * Tallverdi
             */
            value?: number;
          }>;

          /**
           * Forklaring
           */
          explanation?: string;

          /**
           * Javascript variabelnavn (skal normalt ikke endres)
           */
          variableName?: string;
        };
      }
    | {
        /**
         * Selected
         */
        _selected: "globalValue";

        /**
         * Global verdi
         */
        globalValue: {
          /**
           * Velg verdier
           */
          key: string;

          /**
           * Javascript variabelnavn (skal normalt ikke endres)
           */
          variableName?: string;

          /**
           * -
           */
          value?: ;
        };
      }
  >;

  /**
   * Beregning
   */
  calculationScript?: string;

  /**
   * Legg inn tusenskille i svaret
   */
  useThousandSeparator: boolean;

  /**
   * Tekst for beregingsresultat
   */
  summaryText?: string;
}
