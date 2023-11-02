// WARNING: This file was automatically generated by "no.item.xp.codegen". You may lose your changes if you edit it.
export interface FormsOverview {
  /**
   * Side-tittel
   */
  title: string;

  /**
   * Under-tittel
   */
  underTitle?: string;

  /**
   * Ingress/beskrivelse
   */
  ingress: string;

  /**
   * Velg type oversikt
   */
  overviewType: "application" | "complaint" | "addendum";

  /**
   * Velg piktogram
   */
  illustration: string;

  /**
   * Skriv inn ønsket kort-url
   */
  customPath: string;

  /**
   * Vis område-filter
   */
  areasFilterToggle: boolean;

  /**
   * Vis kategori-filter
   */
  taxonomyFilterToggle: boolean;

  /**
   * Vis fritekst-filter
   */
  textFilterToggle: boolean;

  /**
   * Videresend alle besøk til annen url:
   */
  externalProductUrl?: string;

  /**
   * Velg fallback data
   */
  localeFallback?: Array<string>;

  /**
   * Velg innhold som ikke skal vises i denne oversikten
   */
  excludedContent?: Array<string>;

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
           * Velg sidetype
           */
          pageType:
            | {
                /**
                 * Selected
                 */
                _selected: "overview";

                /**
                 * Oversiktsside for underkategori
                 */
                overview: {
                  /**
                   * Velg underkategorier
                   */
                  provider_audience: Array<"doctor" | "municipality_employed" | "optician" | "administrator" | "measures_organizer" | "aid_supplier" | "other">;
                };
              }
            | {
                /**
                 * Selected
                 */
                _selected: "links";

                /**
                 * Transportside til oversikter for underkategorier
                 */
                links: {
                  /**
                   * Lenker til oversiktssider
                   */
                  links: Array<{
                    /**
                     * Lenketekst
                     */
                    text?: string;

                    /**
                     * Velg oversiktsside
                     */
                    link: string;
                  }>;
                };
              };
        };
      };

  /**
   * Velg eier
   */
  owner: Array<"ytelsesavdelingen" | "arbeids_og_tjenesteavdelingen" | "arbeid_og_ytelser_styringsenhet" | "familie_og_pensjonsytelser_styringsenhet" | "hr_avdelingen" | "juridisk_avdeling" | "kunnskapsavdelingen" | "kommunikasjonsavdelingen" | "okonomi" | "statistikk" | "hjelpemidler_og_tilrettelegging" | "kontaktsenteret" | "team_personbruker" | "it_avdelingen" | "fylke" | "hjelpemiddelsentralen" | "arbeidslivssenter" | "min_side" | "direktoratet" | "annet">;

  /**
   * Nøkkelord (internt søk)
   */
  keywords?: Array<string>;

  /**
   * Skal ikke vises i søk
   */
  noindex: boolean;
}
