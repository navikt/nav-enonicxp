// WARNING: This file was automatically generated by "no.item.xp.codegen". You may lose your changes if you edit it.
export interface SituationFlexColsConfig {
  /**
   * Tittel
   */
  title?: string;

  /**
   * Anker-id
   */
  anchorId?: string;

  /**
   * Ikke vis under innhold
   */
  hideFromInternalNavigation: boolean;

  /**
   * Toggle "kopier lenke" knapp
   */
  toggleCopyButton: boolean;

  /**
   * Antall kolonner ved full skjermbredde
   */
  numCols?: number;

  /**
   * Justering
   */
  justifyContent?: "flex-start" | "center" | "flex-end";

  /**
   * Bakgrunnsfarge
   */
  bgColor?: {
    /**
     * Velg farge
     */
    color: string;
  };
}
