// WARNING: This file was automatically generated by "no.item.xp.codegen". You may lose your changes if you edit it.
export interface ProductBlob {
  /**
   * Målgruppe
   */
  audience: "person" | "employer" | "provider" | "self_employed";

  /**
   * Kategori
   */
  taxonomy?: Array<"assistive_tools" | "followup" | "benefits" | "measures" | "service" | "rights" | "for_employers" | "for_providers" | "for_municipality" | "for_event_organizers" | "for_health_service">;

  /**
   * Områdekategori
   */
  area: Array<"work" | "family" | "health" | "accessibility" | "pension" | "social_counselling" | "municipality" | "self_employed" | "other">;

  /**
   * Velg eier
   */
  owner: Array<"ytelsesavdelingen" | "arbeids_og_tjenesteavdelingen" | "arbeid_og_ytelser_styringsenhet" | "familie_og_pensjonsytelser_styringsenhet" | "hr_avdelingen" | "juridisk_avdeling" | "kunnskapsavdelingen" | "kommunikasjonsavdelingen" | "okonomi" | "statistikk" | "hjelpemidler_og_tilrettelegging" | "kontaktsenteret" | "team_personbruker" | "it_avdelingen" | "fylke" | "hjelpemiddelsentralen" | "arbeidslivssenter" | "min_side" | "direktoratet" | "annet">;

  /**
   * Velg forvalter
   */
  "managed-by"?: Array<"po_aap" | "po_arbeid" | "po_familie" | "po_helse" | "po_pensjon" | "po_arbeidsgiver" | "digisos">;

  /**
   * Velg innholdstype for tilknyttede sider
   */
  contentType: "no.nav.navno:product-page" | "no.nav.navno:guide-page" | "no.nav.navno:themed-article-page";

  /**
   * Velg piktogram
   */
  illustration: string;

  /**
   * Norsk bokmål
   */
  contentNo?: {
    /**
     * Produktnavn
     */
    title: string;

    /**
     * Ingress
     */
    ingress: string;

    /**
     * Velg produktside
     */
    productPage?: string;

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
     * Items goes here
     */
    dummy?: undefined;
  };

  /**
   * Nynorsk
   */
  contentNn?: {
    /**
     * Produktnavn
     */
    title: string;

    /**
     * Ingress
     */
    ingress: string;

    /**
     * Velg produktside
     */
    productPage?: string;

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
     * Items goes here
     */
    dummy?: undefined;
  };

  /**
   * Engelsk
   */
  contentEn?: {
    /**
     * Produktnavn
     */
    title: string;

    /**
     * Ingress
     */
    ingress: string;

    /**
     * Velg produktside
     */
    productPage?: string;

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
     * Items goes here
     */
    dummy?: undefined;
  };

  /**
   * Samisk
   */
  contentSe?: {
    /**
     * Produktnavn
     */
    title: string;

    /**
     * Ingress
     */
    ingress: string;

    /**
     * Velg produktside
     */
    productPage?: string;

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
     * Items goes here
     */
    dummy?: undefined;
  };

  /**
   * Andre språk
   */
  contentOther?: Array<{
    /**
     * To-bokstavers språkkode
     */
    lang: string;

    /**
     * Produktnavn
     */
    title: string;

    /**
     * Ingress
     */
    ingress: string;

    /**
     * Velg produktside
     */
    productPage?: string;

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
     * Items goes here
     */
    dummy?: undefined;
  }>;
}
