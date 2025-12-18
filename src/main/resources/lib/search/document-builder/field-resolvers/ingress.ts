import { logger } from '../../../utils/logging';
import { OfficeContent, Publikumsmottak } from '../../../office-pages/types';
import { forceArray, removeDuplicatesFilter } from '../../../utils/array-utils';
import { capitalize } from '../../../utils/string-utils';

const INGRESS_MAX_LENGTH = 500;

const DEFAULT_OFFICE_INGRESS = 'Kontorinformasjon';

const getSted = (publikumsmottak: Publikumsmottak) => {
    if (!publikumsmottak || publikumsmottak.length === 0) {
        return [DEFAULT_OFFICE_INGRESS];
    }

    // For offices with only one publikumsmottak, the 'stedsbeskrivelse' key
    // is not actively used has therefore has not been cleaned by editors in NORG.
    // It may contain strange texts in NORG (ie "Andeby torg, inngang ved postkontoret rundt hjørnet").
    // This is why we use poststed when only 1 publikumsmottak.
    if (publikumsmottak.length === 1) {
        return [capitalize(publikumsmottak[0].besoeksadresse?.poststed ?? '')];
    }

    // For offices with multiple publikumsmottak, the stedsbeskrivelse has been cleaned by editors
    // as it is used in the tabs at the top of an office page.
    return forceArray(publikumsmottak)
        .filter((mottak) => mottak.besoeksadresse?.type === 'stedsadresse')
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

    if (officeData.type === 'HMS' || officeData.type === 'ALS') {
        return content.data.metaDescription || officeData.navn;
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
