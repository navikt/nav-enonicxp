import { logger } from '../../../utils/logging';
import { OfficeContent } from '../../../office-pages/types';
import { forceArray, removeDuplicatesFilter } from '../../../utils/array-utils';
import { capitalize } from '../../../utils/string-utils';

const INGRESS_MAX_LENGTH = 500;

const DEFAULT_OFFICE_INGRESS = 'Kontorinformasjon';

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

    const poststeder = forceArray(officeData.brukerkontakt?.publikumsmottak)
        .filter(
            (mottak) =>
                mottak.besoeksadresse?.type === 'stedsadresse' && !!mottak.besoeksadresse.poststed
        )
        .map((mottak) => capitalize(mottak.besoeksadresse?.poststed as string))
        .filter(removeDuplicatesFilter());

    if (poststeder.length === 0) {
        return DEFAULT_OFFICE_INGRESS;
    }

    const poststederStr =
        poststeder.length === 1
            ? poststeder[0]
            : `${poststeder.slice(0, -1).join(', ')} og ${poststeder.slice(-1)}`;

    return `Lokalkontor i ${poststederStr}`;
};

const withoutTable = (text: string) => text.split('<table')[0];

export const buildSearchDocumentIngress = (ingressTextRaw?: string | null) => {
    return ingressTextRaw ? withoutTable(ingressTextRaw).slice(0, INGRESS_MAX_LENGTH) : '';
};
