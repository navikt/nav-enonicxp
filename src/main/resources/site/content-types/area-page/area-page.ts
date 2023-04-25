// WARNING: This file was automatically generated by "no.item.xp.codegen". You may lose your changes if you edit it.
export interface AreaPage {
  /**
   * Målgruppe
   */
  audience: {
    /**
     * Selected
     */
    _selected: Array<"person" | "employer" | "provider">;
    
    /**
     * Privatperson
     */
    person: Record<string, unknown>;
    
    /**
     * Arbeidsgiver
     */
    employer: Record<string, unknown>;
    
    /**
     * Samarbeidspartner
     */
    provider: {
      /**
       * Underkategori
       */
      provider_audience: "doctor" | "other";
    };
  };

  /**
   * Område
   */
  area: "work" | "family" | "health" | "accessibility" | "pension" | "social_counselling";

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
          internal: Record<string, unknown>;
        }
      | {
          /**
           * Selected
           */
          _selected: "external";

          /**
           * Ekstern lenke
           */
          external: Record<string, unknown>;
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
  owner: Array<"ytelsesavdelingen" | "arbeids_og_tjenesteavdelingen" | "arbeid_og_ytelser_styringsenhet" | "familie_og_pensjonsytelser_styringsenhet" | "hr_avdelingen" | "juridisk_avdeling" | "kunnskapsavdelingen" | "kommunikasjonsavdelingen" | "okonomi" | "statistikk" | "hjelpemidler_og_tilrettelegging" | "kontaktsenteret" | "team_personbruker" | "it_avdelingen" | "fylke" | "hjelpemiddelsentralen" | "arbeidslivssenter" | "min_side" | "direktoratet" | "annet">;

  /**
   * Skriv inn ønsket kort-url
   */
  customPath?: string;

  /**
   * Legg til andre språkversjoner
   */
  languages?: Array<string>;

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
   * Sidebeskrivelse for søk og sosiale medier
   */
  metaDescription?: string;

  /**
   * Canonical url - NB! Skal bare legges inn av hovedredaktør/administrator
   */
  canonicalUrl?: string;

  /**
   * Skal ikke vises i eksternt søk
   */
  noindex: boolean;
}
