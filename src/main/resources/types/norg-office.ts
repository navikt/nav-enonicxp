interface NORGRawOfficeData {
    enhetNr: string;
    navn: string;
    telefonnummer: string;
    telefonnummerKommentar: string;
    epost: undefined | string;
    postadresse: {
        type: string;
        postnummer: string;
        poststed: string;
        postboksnummer: string;
        postboksanlegg?: string;
    };
    besoeksadresse: {
        type: string;
        postnummer: string;
        poststed: string;
        gatenavn: string;
        husnummer: string;
        husbokstav?: string;
        adresseTilleggsnavn?: string;
    };
    spesielleOpplysninger: string;
    brukerkontakt: {
        publikumsmottak: {
            besoeksadresse: {
                type: string;
                postnummer: string;
                poststed: string;
                gatenavn: string;
                husnummer: string;
                husbokstav?: string;
                adresseTilleggsnavn?: string;
            };
            aapningstider: {
                dag?: string;
                dato?: string;
                fra?: string;
                til?: string;
                kommentar: string;
                stengt: string;
                kunTimeavtale: string;
            }[];
            stedsbeskrivelse: string;
            adkomstbeskrivelse?: string;
        }[];
        publikumskanaler: any[];
        brukertjenesteTilbud: {
            tjenester: {
                type: string;
            }[];
            ytterligereInformasjon: string;
        };
        sosialhjelp: {
            digitaleSoeknader: any[];
            papirsoeknadInformasjon: string;
        };
        informasjonUtbetalinger?: string;
        skriftspraak: string;
    };
}
