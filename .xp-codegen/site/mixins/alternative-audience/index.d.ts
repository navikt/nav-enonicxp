// WARNING: This file was automatically generated by "no.item.xp.codegen". You may lose your changes if you edit it.
export type AlternativeAudience = {
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
}
