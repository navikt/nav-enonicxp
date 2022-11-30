// WARNING: This file was automatically generated by "no.item.xp.codegen". You may lose your changes if you edit it.
export interface ThemedArticlePage {
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
  audience: "person" | "employer" | "provider" | "self_employed";

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
  area: Array<"work" | "family" | "health" | "accessibility" | "pension" | "social_counselling" | "municipality" | "self_employed" | "other">;

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

  /**
   * Velg eier
   */
  owner: Array<"ytelsesavdelingen" | "arbeids_og_tjenesteavdelingen" | "arbeid_og_ytelser_styringsenhet" | "familie_og_pensjonsytelser_styringsenhet" | "hr_avdelingen" | "juridisk_avdeling" | "kunnskapsavdelingen" | "kommunikasjonsavdelingen" | "okonomi" | "statistikk" | "hjelpemidler_og_tilrettelegging" | "kontaktsenteret" | "team_personbruker" | "it_avdelingen" | "fylke" | "hjelpemiddelsentralen" | "arbeidslivssenter" | "min_side" | "direktoratet" | "annet">;

  /**
   * Velg forvalter (hvis annet enn eier)
   */
  "managed-by"?: Array<"po_aap" | "po_arbeid" | "po_familie" | "po_helse" | "po_pensjon" | "po_arbeidsgiver" | "digisos">;

  /**
   * Saksbehandlingstider
   */
  processing_times?: string;

  /**
   * Utbetalingsdatoer
   */
  payout_dates?: string;

  /**
   * Satser
   */
  rates?: string;

  /**
   * Legg til andre språkversjoner
   */
  languages?: Array<string>;

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
   * Sidebeskrivelse for søk og sosiale medier
   */
  metaDescription?: string;

  /**
   * Canonical url - NB! Skal bare legges inn av hovedredaktør/administrator
   */
  canonicalUrl?: string;

  /**
   * Skal ikke vises i eksternt søk
   */
  noindex: boolean;
}
