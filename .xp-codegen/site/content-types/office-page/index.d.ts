// WARNING: This file was automatically generated by "no.item.xp.codegen". You may lose your changes if you edit it.
export type OfficePage = {
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
   * Kontordata (OBS! Overskrives fra NORG)
   */
  officeNorgData:
    | {
        /**
         * Selected
         */
        _selected: "data";

        /**
         * Data
         */
        data: {
          /**
           * Checksum
           */
          checksum?: string;

          /**
           * Navn
           */
          navn: string;

          /**
           * Telefonnummer
           */
          telefonnummer: string;

          /**
           * EnhetNr
           */
          enhetNr: string;

          /**
           * Type
           */
          type: string;

          /**
           * Status
           */
          status?: string;

          /**
           * Organisasjonsnummer
           */
          organisasjonsnummer?: string;

          /**
           * Under Etablering Dato
           */
          underEtableringDato?: string;

          /**
           * Aktiveringsdato
           */
          aktiveringsdato?: string;

          /**
           * Under Avvikling Dato
           */
          underAvviklingDato?: string;

          /**
           * Nedleggelsesdato
           */
          nedleggelsesdato?: string;

          /**
           * Sosiale Tjenester
           */
          sosialeTjenester?: string;

          /**
           * Spesielle opplysninger
           */
          spesielleOpplysninger?: string;

          /**
           * Beliggenhet
           */
          beliggenhet?: {
            /**
             * Type
             */
            type?: string;

            /**
             * Postnummer
             */
            postnummer?: string;

            /**
             * Poststed
             */
            poststed?: string;

            /**
             * Gatenavn
             */
            gatenavn?: string;

            /**
             * Husnummer
             */
            husnummer?: string;

            /**
             * Husbokstav
             */
            husbokstav?: string;

            /**
             * Adresse tilleggsnavn
             */
            adresseTilleggsnavn?: string;
          };

          /**
           * Postadresse
           */
          postadresse?: {
            /**
             * Type
             */
            type?: string;

            /**
             * Postnummer
             */
            postnummer?: string;

            /**
             * Poststed
             */
            poststed?: string;

            /**
             * Gatenavn
             */
            gatenavn?: string;

            /**
             * Husnummer
             */
            husnummer?: string;

            /**
             * Husbokstav
             */
            husbokstav?: string;

            /**
             * Adresse tilleggsnavn
             */
            adresseTilleggsnavn?: string;

            /**
             * Postboksnummer
             */
            postboksnummer?: string;

            /**
             * Postboksanlegg
             */
            postboksanlegg?: string;
          };

          /**
           * Brukerkontakt
           */
          brukerkontakt?: {
            /**
             * Publikumsmottak
             */
            publikumsmottak?: Array<{
              /**
               * Besøksadresse
               */
              besoeksadresse?: {
                /**
                 * Type
                 */
                type?: string;

                /**
                 * Postnummer
                 */
                postnummer?: string;

                /**
                 * Poststed
                 */
                poststed?: string;

                /**
                 * Gatenavn
                 */
                gatenavn?: string;

                /**
                 * Husnummer
                 */
                husnummer?: string;

                /**
                 * Husbokstav
                 */
                husbokstav?: string;

                /**
                 * Adresse Tilleggsnavn
                 */
                adresseTilleggsnavn?: string;
              };

              /**
               * Åpningstider
               */
              aapningstider?: Array<{
                /**
                 * Dag
                 */
                dag?: string;

                /**
                 * Dato
                 */
                dato?: string;

                /**
                 * Fra
                 */
                fra?: string;

                /**
                 * Til
                 */
                til?: string;

                /**
                 * Kommentar
                 */
                kommentar?: string;

                /**
                 * Stengt
                 */
                stengt?: string;

                /**
                 * Kun timeavtale
                 */
                kunTimeavtale?: string;
              }>;

              /**
               * Stedsbeskrivelse
               */
              stedsbeskrivelse?: string;

              /**
               * Adkomstbeskrivelse
               */
              adkomstbeskrivelse?: string;
            }>;

            /**
             * Publikumskanaler
             */
            publikumskanaler?: Array<{
              /**
               * Beskrivelse
               */
              beskrivelse?: string;

              /**
               * Telefon
               */
              telefon?: string;

              /**
               * E-post
               */
              epost?: string;

              /**
               * Sortering
               */
              sortOrder?: string;
            }>;

            /**
             * Brukertjenestetilbud
             */
            brukertjenesteTilbud?: {
              /**
               * Tjenester
               */
              tjenester?: Array<{
                /**
                 * Type
                 */
                type?: string;
              }>;

              /**
               * Ytterligere informasjon
               */
              ytterligereInformasjon?: string;
            };

            /**
             * Informasjon utbetalinger
             */
            informasjonUtbetalinger?: string;

            /**
             * Sosialhjelp
             */
            sosialhjelp?: {
              /**
               * Digitale søknader
               */
              digitaleSoeknader?: Array<{
                /**
                 * Lenke
                 */
                lenke?: string;

                /**
                 * Lenketekst
                 */
                lenketekst?: string;
              }>;

              /**
               * Papirsøknad informasjon
               */
              papirsoeknadInformasjon?: string;
            };

            /**
             * Skriftspraak
             */
            skriftspraak?: string;
          };
        };
      };
}
