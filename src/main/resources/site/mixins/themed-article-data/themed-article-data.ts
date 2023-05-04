// WARNING: This file was automatically generated by "no.item.xp.codegen". You may lose your changes if you edit it.
export interface ThemedArticleData {
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
           * Underkategori
           */
          provider_audience: "doctor" | "dentist" | "optician" | "occupational_therapist" | "aid_supplier" | "measures_organizer" | "administrator" | "municipality" | "other";
        };
      };

  /**
   * Kategorier
   */
  taxonomy?: Array<"tips_job" | "help_work" | "when_sick" | "payment" | "complaint_rights" | "user_support" | "about_nav" | "membership_national_insurance" | "recruitment">;

  /**
   * Tilleggskategori
   */
  customCategory?: string;

  /**
   * Områdekategori
   */
  area: Array<"work" | "family" | "health" | "accessibility" | "pension" | "social_counselling" | "municipality" | "other">;

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
}
