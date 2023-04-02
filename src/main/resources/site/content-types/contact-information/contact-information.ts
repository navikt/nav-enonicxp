// WARNING: This file was automatically generated by "no.item.xp.codegen". You may lose your changes if you edit it.
export interface ContactInformation {
  /**
   * Kontakttype
   */
  contactType:
    | {
        /**
         * Selected
         */
        _selected: "chat";

        /**
         * Chat med oss
         */
        chat: {
          /**
           * Tittel
           */
          title?: string;

          /**
           * Avvikstekst
           */
          alertText?: string;

          /**
           * Ingress
           */
          ingress?: string;
        };
      }
    | {
        /**
         * Selected
         */
        _selected: "write";

        /**
         * Skriv til oss
         */
        write: {
          /**
           * Tittel
           */
          title?: string;

          /**
           * URL
           */
          url?: string;

          /**
           * Avvikstekst
           */
          alertText?: string;

          /**
           * Ingress
           */
          ingress?: string;
        };
      }
    | {
        /**
         * Selected
         */
        _selected: "telephone";

        /**
         * Telefonnummer
         */
        telephone: {
          /**
           * Tittel
           */
          title?: string;

          /**
           * Telefonnummer
           */
          phoneNumber?: string;

          /**
           * Tekst
           */
          text?: string;

          /**
           * Avvikstekst
           */
          alertText?: string;

          /**
           * Ordinære åpningstider
           */
          regularOpeningHours?: {
            /**
             * Mandag
             */
            monday?: {

            };

            /**
             * Tirsdag
             */
            tuesday?: {

            };

            /**
             * Onsdag
             */
            wednesday?: {

            };

            /**
             * Torsdag
             */
            thursday?: {

            };

            /**
             * Fredag
             */
            friday?: {

            };

            /**
             * Lørdag
             */
            saturday?: {

            };

            /**
             * Søndag
             */
            sunday?: {

            };
          };

          /**
           * Spesielle åpningstider
           */
          specialOpeningHours?:
            | {
                /**
                 * Selected
                 */
                _selected: "shared";

                /**
                 * Referer til annen åpningstid
                 */
                shared: {
                  /**
                   * Referer til felles spesielle åpningstider
                   */
                  sharedSpecialOpeningHours?: Array<string>;
                };
              }
            | {
                /**
                 * Selected
                 */
                _selected: "custom";

                /**
                 * Tilpass spesielle åpningstider
                 */
                custom: {
                  /**
                   * Synlig fra
                   */
                  validFrom?: string;

                  /**
                   * Synlig til
                   */
                  validTo?: string;

                  /**
                   * Dag
                   */
                  hours: Array<{
                    /**
                     * Dato
                     */
                    date: string;

                    /**
                     * Åpent/Stengt
                     */
                    status:
                      | {
                          /**
                           * Selected
                           */
                          _selected: "closed";

                          /**
                           * Stengt
                           */
                          closed: Record<string, unknown>;
                        }
                      | {
                          /**
                           * Selected
                           */
                          _selected: "open";

                          /**
                           * Åpent
                           */
                          open: Record<string, unknown>;
                        };
                  }>;
                };
              };
        };
      };
}
