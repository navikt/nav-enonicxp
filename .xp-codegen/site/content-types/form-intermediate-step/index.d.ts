// WARNING: This file was automatically generated by "no.item.xp.codegen". You may lose your changes if you edit it.
export type FormIntermediateStep = {
  /**
   * Tittel
   */
  title?: string;

  /**
   * Tekst over tittel
   */
  textAboveTitle?: string;

  /**
   * Tittel for utlisting og sortering
   */
  sortTitle?: string;

  /**
   * Norsk tittel (hvis fremmedspråklig innhold)
   */
  norwegianTitle?: string;

  /**
   * Velg piktogram
   */
  illustration: string;

  /**
   * Skjemanummer
   */
  formNumbers?: Array<string> | string;

  /**
   * Målgruppe
   */
  audience:
    | {
        /**
         * Selected
         */
        _selected: "person";

        /**
         * Privatperson
         */
        person: Record<string, unknown>;
      }
    | {
        /**
         * Selected
         */
        _selected: "employer";

        /**
         * Arbeidsgiver
         */
        employer: Record<string, unknown>;
      }
    | {
        /**
         * Selected
         */
        _selected: "provider";

        /**
         * Samarbeidspartner
         */
        provider: {
          /**
           * Velg underkategorier
           */
          provider_audience: Array<"doctor" | "municipality_employed" | "optician" | "administrator" | "measures_organizer" | "aid_supplier" | "other"> | "doctor" | "municipality_employed" | "optician" | "administrator" | "measures_organizer" | "aid_supplier" | "other";
        };
      }
    | {
        /**
         * Selected
         */
        _selected: "other";

        /**
         * Annet
         */
        other: Record<string, unknown>;
      };

  /**
   * Må begynne med '/start/[målgruppe dersom ikke privatperson]'
   */
  customPath: string;

  /**
   * Redaksjonelt innhold ovenfor valgene
   */
  editorial?: string;

  /**
   * Overskrift til stegene
   */
  stepsHeadline?: string;

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
     * Skjemanummer
     */
    formNumberStepData?: string;

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
             * Ekstern URL
             */
            externalUrl?: string;
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
             * Overstyr tittel
             */
            overrideTitle?: string;

            /**
             * Redaksjonelt innhold ovenfor valgene
             */
            editorial?: string;

            /**
             * Overskrift til stegene
             */
            stepsHeadline?: string;

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
               * Skjemanummer
               */
              formNumberStepData?: string;

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
                     * Intern lenke til skjema,
                     * søknad eller klage
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
                     * Ekstern lenke til skjema,
                     * søknad eller klage
                     */
                    external: {
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
                       * Overstyr
                       * tittel
                       */
                      overrideTitle?: string;

                      /**
                       * Redaksjonelt
                       * innhold
                       * ovenfor
                       * valgene
                       */
                      editorial?: string;

                      /**
                       * Overskrift
                       * til stegene
                       */
                      stepsHeadline?: string;

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
                         * Skjemanummer
                         */
                        formNumberStepData?: string;

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
                               * Intern
                               * lenke
                               * til
                               * skjema,
                               * søknad
                               * eller
                               * klage
                               */
                              internal: {
                                /**
                                 * Internt
                                 * innhold
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
                               * Ekstern
                               * lenke
                               * til
                               * skjema,
                               * søknad
                               * eller
                               * klage
                               */
                              external: {
                                /**
                                 * Ekstern
                                 * URL
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
