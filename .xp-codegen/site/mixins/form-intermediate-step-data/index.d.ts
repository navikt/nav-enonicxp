// WARNING: This file was automatically generated by "no.item.xp.codegen". You may lose your changes if you edit it.
export type FormIntermediateStepData = {
  /**
   * Ingress
   */
  editorial?: string;

  /**
   * Enkeltsteg
   */
  steps: Array<{
    /**
     * Tittel på valget
     */
    label: string;

    /**
     * Ekstra forklaring
     */
    explanation?: string;

    /**
     * Informasjon om språk
     */
    languageDisclaimer?: string;

    /**
     * Dette valget sender brukeren videre til:
     */
    nextStep:
      | {
          /**
           * Selected
           */
          _selected: "internal";

          /**
           * Intern lenke til skjema, søknad eller klage
           */
          internal: {
            /**
             * Internt innhold
             */
            internalContent: string;
          };
        }
      | {
          /**
           * Selected
           */
          _selected: "external";

          /**
           * Ekstern lenke til skjema, søknad eller klage
           */
          external: {
            /**
             * Skjemanummer
             */
            formNumber?: string;

            /**
             * Ekstern URL
             */
            externalUrl: string;
          };
        }
      | {
          /**
           * Selected
           */
          _selected: "next";

          /**
           * Nytt steg, nivå 2
           */
          next: {
            /**
             * Steg
             */
            steps: Array<{
              /**
               * Tittel på valget
               */
              label: string;

              /**
               * Ekstra forklaring
               */
              explanation?: string;

              /**
               * Informasjon om språk
               */
              languageDisclaimer?: string;

              /**
               * Dette valget sender brukeren
               * videre til:
               */
              nextStep:
                | {
                    /**
                     * Selected
                     */
                    _selected: "internal";

                    /**
                     * Intern lenke til skjema, søknad eller klage
                     */
                    internal: {
                      /**
                       * Internt innhold
                       */
                      internalContent: string;
                    };
                  }
                | {
                    /**
                     * Selected
                     */
                    _selected: "external";

                    /**
                     * Ekstern lenke til skjema, søknad eller klage
                     */
                    external: {
                      /**
                       * Skjemanummer
                       */
                      formNumber?: string;

                      /**
                       * Ekstern URL
                       */
                      externalUrl: string;
                    };
                  }
                | {
                    /**
                     * Selected
                     */
                    _selected: "next";

                    /**
                     * Nytt steg, nivå 3
                     */
                    next: {
                      /**
                       * Steg
                       */
                      steps: Array<{
                        /**
                         * Tittel på valget
                         */
                        label: string;

                        /**
                         * Ekstra forklaring
                         */
                        explanation?: string;

                        /**
                         * Informasjon om språk
                         */
                        languageDisclaimer?: string;

                        /**
                         * Dette
                         * valget
                         * sender
                         * brukeren
                         * videre
                         * til:
                         */
                        nextStep:
                          | {
                              /**
                               * Selected
                               */
                              _selected: "internal";

                              /**
                               * Intern lenke til skjema, søknad eller klage
                               */
                              internal: {
                                /**
                                 * Internt innhold
                                 */
                                internalContent: string;
                              };
                            }
                          | {
                              /**
                               * Selected
                               */
                              _selected: "external";

                              /**
                               * Ekstern lenke til skjema, søknad eller klage
                               */
                              external: {
                                /**
                                 * Skjemanummer
                                 */
                                formNumber?: string;

                                /**
                                 * Ekstern URL
                                 */
                                externalUrl: string;
                              };
                            };
                      }>;
                    };
                  };
            }>;
          };
        };
  }>;
};
