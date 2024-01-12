type StringOrNothing = string | undefined;

interface GeneralOfficeData {
    enhetNr: string;
    navn: string;
    telefonnummer: string;
    telefonnummerKommentar: StringOrNothing;
    epost: undefined | string;
    postadresse: {
        type: string;
        postnummer: string;
        poststed: string;
        postboksnummer: string;
        postboksanlegg: StringOrNothing;
    };
    besoeksadresse: {
        type: string;
        postnummer: string;
        poststed: string;
        gatenavn: string;
        husnummer: string;
        husbokstav: StringOrNothing;
        adresseTilleggsnavn: StringOrNothing;
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
                husbokstav: StringOrNothing;
                adresseTilleggsnavn: StringOrNothing;
            };
            aapningstider: {
                dag: StringOrNothing;
                dato: StringOrNothing;
                fra: StringOrNothing;
                til: StringOrNothing;
                kommentar: string;
                stengt: string;
                kunTimeavtale: string;
            }[];
            stedsbeskrivelse: string;
            adkomstbeskrivelse: StringOrNothing;
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
        informasjonUtbetalinger: StringOrNothing;
        skriftspraak: string;
    };
}
