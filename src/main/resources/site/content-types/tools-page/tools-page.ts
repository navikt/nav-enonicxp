// WARNING: This file was automatically generated by "no.item.xp.codegen". You may lose your changes if you edit it.
export interface ToolsPage {
  /**
   * Velg eier
   */
  owner: Array<"ytelsesavdelingen" | "arbeids_og_tjenesteavdelingen" | "arbeid_og_ytelser_styringsenhet" | "familie_og_pensjonsytelser_styringsenhet" | "hr_avdelingen" | "juridisk_avdeling" | "kunnskapsavdelingen" | "kommunikasjonsavdelingen" | "okonomi" | "statistikk" | "hjelpemidler_og_tilrettelegging" | "kontaktsenteret" | "team_personbruker" | "it_avdelingen" | "fylke" | "hjelpemiddelsentralen" | "arbeidslivssenter" | "min_side" | "direktoratet" | "annet">;

  /**
   * Velg forvalter
   */
  "managed-by"?: Array<"po_aap" | "po_arbeid" | "po_familie" | "po_helse" | "po_pensjon" | "po_arbeidsgiver" | "digisos">;

  /**
   * Legg til andre språkversjoner
   */
  languages?: Array<string>;
}
