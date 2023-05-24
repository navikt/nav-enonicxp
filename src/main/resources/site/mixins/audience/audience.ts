// WARNING: This file was automatically generated by "no.item.xp.codegen". You may lose your changes if you edit it.
export interface Audience {
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
}
