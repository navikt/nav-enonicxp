// WARNING: This file was automatically generated by "no.item.xp.codegen". You may lose your changes if you edit it.
export type FrontpageCurrentTopics = {
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


  link?:
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
};
