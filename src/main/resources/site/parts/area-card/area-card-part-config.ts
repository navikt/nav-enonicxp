// WARNING: This file was automatically generated by "no.item.xp.codegen". You may lose your changes if you edit it.
export interface AreaCardPartConfig {

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
   * Grafikk
   */
  area: "payments" | "cases" | "employment-status-form" | "work" | "family" | "health" | "accessibility" | "pension" | "social_counselling";
}
