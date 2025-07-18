// WARNING: This file was automatically generated by "no.item.xp.codegen". You may lose your changes if you edit it.
export type AreaPage = {
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
   * Område
   */
  area: "work" | "family" | "health" | "accessibility" | "pension" | "social_counselling" | "other";

  /**
   * Overskrift
   */
  header: string;

  /**
   * Banner
   */
  banner?: {

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
     * Velg farge
     */
    color: string;

    /**
     * Innhold
     */
    html?: string;
  };

  /**
   * Velg eier
   */
  owner: Array<"arbeids_og_tjenesteavdelingen" | "kontaktsenteret" | "arbeidsavdelingen_arbeid_helse" | "arbeidsavdelingen_arbeidsgivertjenester" | "arbeidsavdelingen_arbeidsmarkedstiltak" | "arbeidsavdelingen_arbeidsoppfolging" | "avdeling for brukeropplevelse" | "hr_avdelingen" | "direktoratet" | "juridisk_avdeling" | "kommunikasjonsavdelingen" | "kunnskapsavdelingen" | "statistikk" | "klageinstans" | "it_avdelingen" | "velferdsavdelingen" | "hjelpemidler_og_tilrettelegging" | "velferdsavdelingen_hjelpemidler" | "velferdsavdelingen_sosiale_tjenester" | "ytelsesavdelingen" | "arbeid_og_ytelser_styringsenhet" | "familie_og_pensjonsytelser_styringsenhet" | "ytelsesavdelingen_nav_kontroll" | "ytelsesavdelingen_arbeidsavklaringspenger" | "ytelsesavdelingen_arbeidsytelser" | "ytelsesavdelingen_familieytelser" | "ytelsesavdelingen_helseytelser" | "ytelsesavdelingen_kontroll" | "ytelsesavdelingen_pensjon" | "okonomi" | "annet" | "arbeidslivssenter" | "fylke" | "hjelpemiddelsentralen" | "min_side" | "team_personbruker"> | "arbeids_og_tjenesteavdelingen" | "kontaktsenteret" | "arbeidsavdelingen_arbeid_helse" | "arbeidsavdelingen_arbeidsgivertjenester" | "arbeidsavdelingen_arbeidsmarkedstiltak" | "arbeidsavdelingen_arbeidsoppfolging" | "avdeling for brukeropplevelse" | "hr_avdelingen" | "direktoratet" | "juridisk_avdeling" | "kommunikasjonsavdelingen" | "kunnskapsavdelingen" | "statistikk" | "klageinstans" | "it_avdelingen" | "velferdsavdelingen" | "hjelpemidler_og_tilrettelegging" | "velferdsavdelingen_hjelpemidler" | "velferdsavdelingen_sosiale_tjenester" | "ytelsesavdelingen" | "arbeid_og_ytelser_styringsenhet" | "familie_og_pensjonsytelser_styringsenhet" | "ytelsesavdelingen_nav_kontroll" | "ytelsesavdelingen_arbeidsavklaringspenger" | "ytelsesavdelingen_arbeidsytelser" | "ytelsesavdelingen_familieytelser" | "ytelsesavdelingen_helseytelser" | "ytelsesavdelingen_kontroll" | "ytelsesavdelingen_pensjon" | "okonomi" | "annet" | "arbeidslivssenter" | "fylke" | "hjelpemiddelsentralen" | "min_side" | "team_personbruker";

  /**
   * Skriv inn ønsket kort-url
   */
  customPath: string;

  /**
   * Legg til andre språkversjoner
   */
  languages?: Array<string> | string;

  /**
   * Fant du det du lette etter?
   */
  feedbackToggle: boolean;

  /**
   * Chatbot Frida
   */
  chatbotToggle: boolean;

  /**
   * Oppsummering
   */
  description?: string;

  /**
   * Nøkkelord (internt søk)
   */
  keywords?: Array<string> | string;

  /**
   * Sidebeskrivelse for søk og sosiale medier
   */
  metaDescription?: string;

  /**
   * Canonical url - NB! Skal bare legges inn av hovedredaktør/administrator
   */
  canonicalUrl?: string;

  /**
   * Skal ikke vises i søk
   */
  noindex: boolean;

  /**
   * Ikke vis "tilfeldige" utdrag (snippets) i Google-søk
   */
  nosnippet: boolean;
};
