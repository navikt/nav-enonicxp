// WARNING: This file was automatically generated by "no.item.xp.codegen". You may lose your changes if you edit it.
export type Overview = {
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
  audience: Array<"person" | "employer" | "provider"> | "person" | "employer" | "provider";

  /**
   * Type oversiktsside
   */
  overviewType: "rates" | "payout_dates" | "processing_times" | "all_products";

  /**
   * Velg fallback data
   */
  localeFallback?: Array<string> | string;

  /**
   * Velg innhold som ikke skal vises i denne oversikten
   */
  excludedContent?: Array<string> | string;

  /**
   * Velg piktogram
   */
  illustration: string;

  /**
   * Skriv inn ønsket kort-url
   */
  customPath: string;

  /**
   * Velg eier
   */
  owner: Array<"ytelsesavdelingen" | "arbeids_og_tjenesteavdelingen" | "arbeid_og_ytelser_styringsenhet" | "familie_og_pensjonsytelser_styringsenhet" | "hr_avdelingen" | "juridisk_avdeling" | "kunnskapsavdelingen" | "kommunikasjonsavdelingen" | "okonomi" | "statistikk" | "hjelpemidler_og_tilrettelegging" | "kontaktsenteret" | "team_personbruker" | "it_avdelingen" | "fylke" | "hjelpemiddelsentralen" | "arbeidslivssenter" | "min_side" | "direktoratet" | "annet"> | "ytelsesavdelingen" | "arbeids_og_tjenesteavdelingen" | "arbeid_og_ytelser_styringsenhet" | "familie_og_pensjonsytelser_styringsenhet" | "hr_avdelingen" | "juridisk_avdeling" | "kunnskapsavdelingen" | "kommunikasjonsavdelingen" | "okonomi" | "statistikk" | "hjelpemidler_og_tilrettelegging" | "kontaktsenteret" | "team_personbruker" | "it_avdelingen" | "fylke" | "hjelpemiddelsentralen" | "arbeidslivssenter" | "min_side" | "direktoratet" | "annet";

  /**
   * Velg forvalter
   */
  "managed-by"?: Array<"po_aap" | "po_arbeid" | "po_familie" | "po_helse" | "po_pensjon" | "po_arbeidsgiver" | "digisos"> | "po_aap" | "po_arbeid" | "po_familie" | "po_helse" | "po_pensjon" | "po_arbeidsgiver" | "digisos";

  /**
   * Legg til andre språkversjoner
   */
  languages?: Array<string> | string;

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
   * Nøkkelord (internt søk)
   */
  keywords?: Array<string> | string;

  /**
   * Sidebeskrivelse for søk og sosiale medier
   */
  metaDescription?: string;

  /**
   * Canonical url - NB! Skal bare legges inn av hovedredaktør/administrator
   */
  canonicalUrl?: string;

  /**
   * Skal ikke vises i søk
   */
  noindex: boolean;

  /**
   * Ikke vis "tilfeldige" utdrag (snippets) i Google-søk
   */
  nosnippet: boolean;

  /**
   * (tomt felt, skal ikke brukes)
   */
  allProducts?: string;
};
