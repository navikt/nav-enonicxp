// WARNING: This file was automatically generated by "no.item.xp.codegen". You may lose your changes if you edit it.
export type PayoutDates = {
  /**
   * Velg utbetalingsdatoer
   */
  dates: string;

  /**
   * Utvidbar
   */
  expandable: boolean;

  /**
   * Tittel på utvidbart panel
   */
  expandableTitle?: string;

  /**
   * Anker-id på utvidbart panel
   */
  expandableAnchorId?: string;

  /**
   * Velg visning
   */
  renderOnAuthState: "always" | "loggedIn" | "loggedOut";
};
