// WARNING: This file was automatically generated by "no.item.xp.codegen". You may lose your changes if you edit it.
export interface PageMeta {
  /**
   * Type innhold
   */
  contentType:
    | {
        /**
         * Selected
         */
        _selected: "product_page";

        /**
         * Produktside
         */
        product_page: {
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
                provider: Record<string, unknown>;
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
           * Områdekategori
           */
          area: Array<"health" | "other" | "work" | "family" | "accessibility" | "pension" | "social_counselling" | "inclusion" | "downsizing" | "recruitment">;

          /**
           * Kategori
           */
          taxonomy?: Array<"insurance" | "measures" | "service" | "rights" | "assistive_tools" | "benefits" | "employee_benefits" | "refund">;

          /**
           * Velg piktogram
           */
          illustration: string;

          /**
           * Velg eier
           */
          owner: Array<"ytelsesavdelingen" | "arbeids_og_tjenesteavdelingen" | "arbeid_og_ytelser_styringsenhet" | "familie_og_pensjonsytelser_styringsenhet" | "hr_avdelingen" | "juridisk_avdeling" | "kunnskapsavdelingen" | "kommunikasjonsavdelingen" | "okonomi" | "statistikk" | "hjelpemidler_og_tilrettelegging" | "kontaktsenteret" | "team_personbruker" | "it_avdelingen" | "fylke" | "hjelpemiddelsentralen" | "arbeidslivssenter" | "min_side" | "direktoratet" | "annet">;

          /**
           * Velg forvalter
           */
          "managed-by"?: Array<"po_aap" | "po_arbeid" | "po_familie" | "po_helse" | "po_pensjon" | "po_arbeidsgiver" | "digisos">;

          /**
           * Saksbehandlingstider
           */
          processing_times?: string;

          /**
           * Utbetalingsdatoer
           */
          payout_dates?: string;

          /**
           * Satser
           */
          rates?: string;

          /**
           * Skriv inn ønsket kort-url
           */
          customPath: string;

          /**
           * Velg alle detaljer som skal brukes på denne siden
           */
          formDetailsTargets?: Array<string>;

          /**
           * Fant du det du lette etter?
           */
          feedbackToggle: boolean;

          /**
           * Chatbot Frida
           */
          chatbotToggle: boolean;
        };
      }
    | {
        /**
         * Selected
         */
        _selected: "situation_page";

        /**
         * Situasjonsside
         */
        situation_page: {
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
                provider: Record<string, unknown>;
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
           * Områdekategori
           */
          area: Array<"health" | "other" | "work" | "family" | "accessibility" | "pension" | "social_counselling" | "inclusion" | "downsizing" | "recruitment">;

          /**
           * Velg piktogram
           */
          illustration: string;

          /**
           * Skriv inn ønsket kort-url
           */
          customPath: string;

          /**
           * Velg eier
           */
          owner: Array<"ytelsesavdelingen" | "arbeids_og_tjenesteavdelingen" | "arbeid_og_ytelser_styringsenhet" | "familie_og_pensjonsytelser_styringsenhet" | "hr_avdelingen" | "juridisk_avdeling" | "kunnskapsavdelingen" | "kommunikasjonsavdelingen" | "okonomi" | "statistikk" | "hjelpemidler_og_tilrettelegging" | "kontaktsenteret" | "team_personbruker" | "it_avdelingen" | "fylke" | "hjelpemiddelsentralen" | "arbeidslivssenter" | "min_side" | "direktoratet" | "annet">;

          /**
           * Velg forvalter
           */
          "managed-by"?: Array<"po_aap" | "po_arbeid" | "po_familie" | "po_helse" | "po_pensjon" | "po_arbeidsgiver" | "digisos">;

          /**
           * Fant du det du lette etter?
           */
          feedbackToggle: boolean;

          /**
           * Chatbot Frida
           */
          chatbotToggle: boolean;
        };
      }
    | {
        /**
         * Selected
         */
        _selected: "tools_page";

        /**
         * Verktøyside
         */
        tools_page: {
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
                provider: Record<string, unknown>;
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
           * Kategorier
           */
          taxonomy?: Array<"calculator" | "navigator">;

          /**
           * Områdekategori
           */
          area: Array<"health" | "other" | "work" | "family" | "accessibility" | "pension" | "social_counselling" | "inclusion" | "downsizing" | "recruitment">;

          /**
           * Velg piktogram
           */
          illustration: string;

          /**
           * Skriv inn ønsket kort-url
           */
          customPath: string;

          /**
           * Velg eier
           */
          owner: Array<"ytelsesavdelingen" | "arbeids_og_tjenesteavdelingen" | "arbeid_og_ytelser_styringsenhet" | "familie_og_pensjonsytelser_styringsenhet" | "hr_avdelingen" | "juridisk_avdeling" | "kunnskapsavdelingen" | "kommunikasjonsavdelingen" | "okonomi" | "statistikk" | "hjelpemidler_og_tilrettelegging" | "kontaktsenteret" | "team_personbruker" | "it_avdelingen" | "fylke" | "hjelpemiddelsentralen" | "arbeidslivssenter" | "min_side" | "direktoratet" | "annet">;

          /**
           * Velg forvalter
           */
          "managed-by"?: Array<"po_aap" | "po_arbeid" | "po_familie" | "po_helse" | "po_pensjon" | "po_arbeidsgiver" | "digisos">;
        };
      }
    | {
        /**
         * Selected
         */
        _selected: "generic_page";

        /**
         * Generisk side
         */
        generic_page: {
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
                provider: Record<string, unknown>;
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
           * Velg piktogram
           */
          illustration: string;

          /**
           * Skriv inn ønsket kort-url
           */
          customPath: string;

          /**
           * Fant du det du lette etter?
           */
          feedbackToggle: boolean;

          /**
           * Chatbot Frida
           */
          chatbotToggle: boolean;
        };
      }
    | {
        /**
         * Selected
         */
        _selected: "themed_article_page";

        /**
         * Temaartikkel
         */
        themed_article_page: {
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
                provider: Record<string, unknown>;
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
           * Kategorier
           */
          taxonomy?: Array<"tips_job" | "help_work" | "when_sick" | "payment" | "complaint_rights" | "user_support" | "about_nav" | "membership_national_insurance" | "recruitment">;

          /**
           * Områdekategori
           */
          area: Array<"health" | "other" | "work" | "family" | "accessibility" | "pension" | "social_counselling" | "inclusion" | "downsizing" | "recruitment">;

          /**
           * Velg piktogram
           */
          illustration: string;

          /**
           * Skriv inn ønsket kort-url
           */
          customPath: string;

          /**
           * Velg eier
           */
          owner: Array<"ytelsesavdelingen" | "arbeids_og_tjenesteavdelingen" | "arbeid_og_ytelser_styringsenhet" | "familie_og_pensjonsytelser_styringsenhet" | "hr_avdelingen" | "juridisk_avdeling" | "kunnskapsavdelingen" | "kommunikasjonsavdelingen" | "okonomi" | "statistikk" | "hjelpemidler_og_tilrettelegging" | "kontaktsenteret" | "team_personbruker" | "it_avdelingen" | "fylke" | "hjelpemiddelsentralen" | "arbeidslivssenter" | "min_side" | "direktoratet" | "annet">;

          /**
           * Velg forvalter
           */
          "managed-by"?: Array<"po_aap" | "po_arbeid" | "po_familie" | "po_helse" | "po_pensjon" | "po_arbeidsgiver" | "digisos">;

          /**
           * Saksbehandlingstider
           */
          processing_times?: string;

          /**
           * Utbetalingsdatoer
           */
          payout_dates?: string;

          /**
           * Satser
           */
          rates?: string;

          /**
           * Fant du det du lette etter?
           */
          feedbackToggle: boolean;

          /**
           * Chatbot Frida
           */
          chatbotToggle: boolean;
        };
      }
    | {
        /**
         * Selected
         */
        _selected: "guide_page";

        /**
         * Slik gjør du det
         */
        guide_page: {
          /**
           * Ikke vis denne siden på oversiktssider (gjelder ikke skjemaoversikter)
           */
          hideFromProductlist: boolean;

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
                provider: Record<string, unknown>;
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
           * Områdekategori
           */
          area: Array<"health" | "other" | "work" | "family" | "accessibility" | "pension" | "social_counselling" | "inclusion" | "downsizing" | "recruitment">;

          /**
           * Velg piktogram
           */
          illustration: string;

          /**
           * Skriv inn ønsket kort-url
           */
          customPath: string;

          /**
           * Velg eier
           */
          owner: Array<"ytelsesavdelingen" | "arbeids_og_tjenesteavdelingen" | "arbeid_og_ytelser_styringsenhet" | "familie_og_pensjonsytelser_styringsenhet" | "hr_avdelingen" | "juridisk_avdeling" | "kunnskapsavdelingen" | "kommunikasjonsavdelingen" | "okonomi" | "statistikk" | "hjelpemidler_og_tilrettelegging" | "kontaktsenteret" | "team_personbruker" | "it_avdelingen" | "fylke" | "hjelpemiddelsentralen" | "arbeidslivssenter" | "min_side" | "direktoratet" | "annet">;

          /**
           * Velg forvalter
           */
          "managed-by"?: Array<"po_aap" | "po_arbeid" | "po_familie" | "po_helse" | "po_pensjon" | "po_arbeidsgiver" | "digisos">;

          /**
           * Saksbehandlingstider
           */
          processing_times?: string;

          /**
           * Utbetalingsdatoer
           */
          payout_dates?: string;

          /**
           * Satser
           */
          rates?: string;

          /**
           * Velg alle detaljer som skal brukes på denne siden
           */
          formDetailsTargets?: Array<string>;

          /**
           * Fant du det du lette etter?
           */
          feedbackToggle: boolean;

          /**
           * Chatbot Frida
           */
          chatbotToggle: boolean;
        };
      }
    | {
        /**
         * Selected
         */
        _selected: "current_topic_page";

        /**
         * Aktuelt
         */
        current_topic_page: {
          /**
           * Sett side-tittel
           */
          title?: string;

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
                provider: Record<string, unknown>;
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
           * Områdekategori
           */
          area: Array<"health" | "other" | "work" | "family" | "accessibility" | "pension" | "social_counselling" | "inclusion" | "downsizing" | "recruitment">;

          /**
           * Skriv inn ønsket kort-url
           */
          customPath: string;

          /**
           * Velg eier
           */
          owner: Array<"ytelsesavdelingen" | "arbeids_og_tjenesteavdelingen" | "arbeid_og_ytelser_styringsenhet" | "familie_og_pensjonsytelser_styringsenhet" | "hr_avdelingen" | "juridisk_avdeling" | "kunnskapsavdelingen" | "kommunikasjonsavdelingen" | "okonomi" | "statistikk" | "hjelpemidler_og_tilrettelegging" | "kontaktsenteret" | "team_personbruker" | "it_avdelingen" | "fylke" | "hjelpemiddelsentralen" | "arbeidslivssenter" | "min_side" | "direktoratet" | "annet">;

          /**
           * Velg forvalter
           */
          "managed-by"?: Array<"po_aap" | "po_arbeid" | "po_familie" | "po_helse" | "po_pensjon" | "po_arbeidsgiver" | "digisos">;

          /**
           * Fant du det du lette etter?
           */
          feedbackToggle: boolean;

          /**
           * Chatbot Frida
           */
          chatbotToggle: boolean;
        };
      };
}
