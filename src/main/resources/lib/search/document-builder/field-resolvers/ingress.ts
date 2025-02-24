import { logger } from '../../../utils/logging';
import { OfficeContent, OfficePage } from '../../../office-pages/types';
import { forceArray, removeDuplicatesFilter } from '../../../utils/array-utils';
import { capitalize } from '../../../utils/string-utils';

const INGRESS_MAX_LENGTH = 500;

const DEFAULT_OFFICE_INGRESS = 'Kontorinformasjon';

type Publikumsmottak = NonNullable<
    OfficePage['data']['officeNorgData']['data']['brukerkontakt']
>['publikumsmottak'];

const getSted = (publikumsmottak: Publikumsmottak) => {
    if (!publikumsmottak || publikumsmottak.length === 0) {
        return [DEFAULT_OFFICE_INGRESS];
    }

    // For offices with only one publikumsmottak, the 'stedsbeskrivelse' key
    // will not be actively used and may contain strange texts
    // (ie "Andeby torg, inngang ved postkontoret rundt hjørnet").
    // In these cases, use the postal city.
    if (publikumsmottak.length === 1) {
        return [capitalize(publikumsmottak[0].besoeksadresse?.poststed ?? '')];
    }

    // For offices with multiple publikumsmottak, try stedsbeskrivelse and then poststed if
    // stedsbeskrivelse doesn't exist. This makes the display match the tagline on the office page,
    // and in these cases the stedsbeskrivelse field in Norg is already cleaned since it's
    // used in the tabs for the office page.
    return forceArray(publikumsmottak)
        .filter(
            (mottak) =>
                mottak.besoeksadresse?.type === 'stedsadresse' && !!mottak.besoeksadresse.poststed
        )
        .map((mottak) =>
            capitalize(mottak.stedsbeskrivelse ?? mottak.besoeksadresse?.poststed ?? '')
        )
        .filter(removeDuplicatesFilter())
        .filter((navn) => !!navn);
};

export const buildSearchDocumentOfficeIngress = (content: OfficeContent) => {
    // Legacy offices
    if (content.type === 'no.nav.navno:office-information') {
        return DEFAULT_OFFICE_INGRESS;
    }

    const officeData = content.data.officeNorgData?.data;

    if (!officeData) {
        logger.warning(
            `Build search document for office ingress: Could not find office data for ${content._id}`
        );
        return '';
    }

    // HMS (Hjelpemiddelsentral)
    if (officeData.type === 'HMS') {
        return officeData.navn; // i.e "NAV Hjelpemiddelsentral i Oslo"
    }

    const steder = getSted(officeData.brukerkontakt?.publikumsmottak);

    if (steder.length === 0) {
        return DEFAULT_OFFICE_INGRESS;
    }

    const stedAsSentence =
        steder.length === 1
            ? steder[0]
            : `${steder.slice(0, -1).join(', ')} og ${steder.slice(-1)}`;

    return `Lokalkontor i ${stedAsSentence}`;
};

const withoutTable = (text: string) => text.split('<table')[0];

export const buildSearchDocumentIngress = (ingressTextRaw?: string | null) => {
    return ingressTextRaw ? withoutTable(ingressTextRaw).slice(0, INGRESS_MAX_LENGTH) : '';
};
