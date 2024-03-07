// WARNING: This file was automatically generated by "no.item.xp.codegen". You may lose your changes if you edit it.
export interface FrontpageCurrentTopicsPartConfig {
  /**
   * Tittel
   */
  title?: string;

  /**
   * Velg innholdsliste
   */
  contentList: string;

  /**
   * Maks antall lenker
   */
  maxItems?: number;

  /**
   * Sorter etter publiseringsdato
   */
  sortByPublishDate: boolean;


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
}
