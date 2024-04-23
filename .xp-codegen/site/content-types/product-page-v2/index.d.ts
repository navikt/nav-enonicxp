// WARNING: This file was automatically generated by "no.item.xp.codegen". You may lose your changes if you edit it.
export type ProductPageV2 = {
  /**
   * Sett side-tittel
   */
  title?: string;

  /**
   * Tittel for utlisting og sortering
   */
  sortTitle?: string;

  /**
   * Norsk tittel (hvis fremmedspråklig innhold)
   */
  norwegianTitle?: string;

  /**
   * Ingress
   */
  ingress: string;

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
   * Kategori
   */
  taxonomy?: Array<"insurance" | "measures" | "service" | "rights" | "assistive_tools" | "benefits" | "employee_benefits" | "refund"> | "insurance" | "measures" | "service" | "rights" | "assistive_tools" | "benefits" | "employee_benefits" | "refund";

  /**
   * Områdekategori
   */
  area: Array<"health" | "other" | "work" | "family" | "accessibility" | "pension" | "social_counselling" | "inclusion" | "downsizing" | "recruitment"> | "health" | "other" | "work" | "family" | "accessibility" | "pension" | "social_counselling" | "inclusion" | "downsizing" | "recruitment";

  /**
   * Aktuelle målgrupper
   */
  alternativeAudience?: {
    /**
     * Selected
     */
    _selected: Array<"person" | "employer" | "provider">;
    
    /**
     * Privatperson
     */
    person: {
      /**
       * Innhold
       */
      targetPage: string;
    };
    
    /**
     * Arbeidsgiver
     */
    employer: {
      /**
       * Innhold
       */
      targetPage: string;
    };
    
    /**
     * Samarbeidspartner
     */
    provider: {
      /**
       * Velg samarbeidspartner
       */
      providerList: Array<{
        /**
         * Type samarbeidspartner
         */
        subProviders: Array<
          | {
              /**
               * Selected
               */
              _selected: "doctor";

              /**
               * Lege, tannlege eller annen behandler
               */
              doctor: Record<string, unknown>;
            }
          | {
              /**
               * Selected
               */
              _selected: "municipality_employed";

              /**
               * Ansatt i kommunen eller fylkeskommunen
               */
              municipality_employed: Record<string, unknown>;
            }
          | {
              /**
               * Selected
               */
              _selected: "optician";

              /**
               * Optiker eller øyelege
               */
              optician: Record<string, unknown>;
            }
          | {
              /**
               * Selected
               */
              _selected: "administrator";

              /**
               * Bostyrer
               */
              administrator: Record<string, unknown>;
            }
          | {
              /**
               * Selected
               */
              _selected: "measures_organizer";

              /**
               * Tiltaksarrangør
               */
              measures_organizer: Record<string, unknown>;
            }
          | {
              /**
               * Selected
               */
              _selected: "aid_supplier";

              /**
               * Hjelpemiddelformidler
               */
              aid_supplier: Record<string, unknown>;
            }
          | {
              /**
               * Selected
               */
              _selected: "other";

              /**
               * Andre samarbeidspartnere
               */
              other: {
                /**
                 * Alternativ målgruppe
                 */
                overrideLabel?: string;
              };
            }
        >;

        /**
         * Innhold
         */
        targetPage: string;
      }>;
    };
  };

  /**
   * Situasjoner
   */
  relatedSituations?: Array<string> | string;

  /**
   * Velg piktogram
   */
  illustration: string;

  /**
   * Videresend alle besøk til annen url:
   */
  externalProductUrl?: string;

  /**
   * Skriv inn ønsket kort-url
   */
  customPath: string;

  /**
   * Velg eier
   */
  owner: Array<"ytelsesavdelingen" | "arbeids_og_tjenesteavdelingen" | "arbeid_og_ytelser_styringsenhet" | "familie_og_pensjonsytelser_styringsenhet" | "hr_avdelingen" | "juridisk_avdeling" | "kunnskapsavdelingen" | "kommunikasjonsavdelingen" | "okonomi" | "statistikk" | "hjelpemidler_og_tilrettelegging" | "kontaktsenteret" | "team_personbruker" | "it_avdelingen" | "fylke" | "hjelpemiddelsentralen" | "arbeidslivssenter" | "min_side" | "direktoratet" | "annet"> | "ytelsesavdelingen" | "arbeids_og_tjenesteavdelingen" | "arbeid_og_ytelser_styringsenhet" | "familie_og_pensjonsytelser_styringsenhet" | "hr_avdelingen" | "juridisk_avdeling" | "kunnskapsavdelingen" | "kommunikasjonsavdelingen" | "okonomi" | "statistikk" | "hjelpemidler_og_tilrettelegging" | "kontaktsenteret" | "team_personbruker" | "it_avdelingen" | "fylke" | "hjelpemiddelsentralen" | "arbeidslivssenter" | "min_side" | "direktoratet" | "annet";

  /**
   * Velg forvalter
   */
  "managed-by"?: Array<"po_aap" | "po_arbeid" | "po_familie" | "po_helse" | "po_pensjon" | "po_arbeidsgiver" | "digisos"> | "po_aap" | "po_arbeid" | "po_familie" | "po_helse" | "po_pensjon" | "po_arbeidsgiver" | "digisos";

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
  formDetailsTargets?: Array<string> | string;
}
