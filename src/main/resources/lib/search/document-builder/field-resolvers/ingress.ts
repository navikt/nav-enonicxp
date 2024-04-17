import { OfficeContent } from '../../../office-pages/types';
import { forceArray, removeDuplicatesFilter } from '../../../utils/array-utils';
import { capitalize } from '../../../utils/string-utils';

const INGRESS_MAX_LENGTH = 500;

const DEFAULT_OFFICE_INGRESS = 'Kontorinformasjon';

export const buildSearchDocumentOfficeIngress = (content: OfficeContent) => {
    const isLocalOffice = content.type === 'no.nav.navno:office-branch';
    if (!isLocalOffice) {
        return DEFAULT_OFFICE_INGRESS;
    }

    const poststeder = forceArray(content.data.brukerkontakt?.publikumsmottak)
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

export const buildSearchDocumentIngress = (ingressTextRaw?: string) => {
    return ingressTextRaw ? withoutTable(ingressTextRaw).slice(0, INGRESS_MAX_LENGTH) : '';
};
