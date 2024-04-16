import { OfficeContent } from '../../../office-pages/types';
import { forceArray, removeDuplicatesFilter } from '../../../utils/array-utils';
import { OfficeBranch } from '@xp-types/site/content-types/office-branch';

type Publikumsmottak = NonNullable<NonNullable<OfficeBranch['brukerkontakt']>['publikumsmottak']>;
type WithBesoeksAdresse = NonNullable<Pick<Publikumsmottak[number], 'besoeksadresse'>>;

const DEFAULT_PHONE = '55 55 33 33';

const INGRESS_MAX_LENGTH = 500;

const buildPhoneElement = (phoneNr?: string) =>
    `<strong>Telefon:</strong> ${phoneNr || DEFAULT_PHONE}`;

const getPublikumsmottak = (content: OfficeContent): Publikumsmottak | undefined => {
    const { type, data } = content;

    switch (type) {
        case 'no.nav.navno:office-page':
            return data.officeNorgData.data.brukerkontakt?.publikumsmottak;
        case 'no.nav.navno:office-branch':
            return data.brukerkontakt?.publikumsmottak;
        case 'no.nav.navno:office-information':
            return data.kontaktinformasjon?.publikumsmottak;
    }
};

const buildAddressElement = (content: OfficeContent) => {
    const publikumsmottak = getPublikumsmottak(content);

    const validMottak = forceArray(publikumsmottak)
        .filter(
            (mottak): mottak is WithBesoeksAdresse => mottak.besoeksadresse?.type === 'stedsadresse'
        )
        .filter(
            removeDuplicatesFilter(
                (a, b) => a.besoeksadresse?.postnummer === b.besoeksadresse?.postnummer
            )
        );

    if (validMottak.length === 0) {
        return null;
    }

    const addresses = validMottak.map((mottak) => {
        const {
            gatenavn = '',
            husnummer = '',
            husbokstav = '',
            postnummer = '',
            poststed = '',
        } = mottak.besoeksadresse as any;

        const husNrOgBokstav = husnummer || husbokstav ? ` ${husnummer}${husbokstav}` : '';
        return `${gatenavn}${husNrOgBokstav}, ${postnummer} ${poststed.toUpperCase()}`;
    });

    const addressesList =
        addresses.length === 1
            ? addresses[0]
            : `<ul>${addresses.map((address) => `<li>${address}</li>`).join('')}</ul>`;

    return `<strong>Publikumsmottak:</strong> ${addressesList}`;
};

export const buildSearchDocumentOfficeIngress = (content: OfficeContent) => {
    const phoneElement = buildPhoneElement(
        content.type === 'no.nav.navno:office-information'
            ? content.data.kontaktinformasjon?.telefonnummer
            : DEFAULT_PHONE
    );

    const addressElement = buildAddressElement(content);

    return addressElement ? `${phoneElement}<br/>${addressElement}` : phoneElement;
};

const withoutTable = (text: string) => text.split('<table')[0];

export const buildSearchDocumentIngress = (ingressTextRaw?: string) => {
    return ingressTextRaw ? withoutTable(ingressTextRaw).slice(0, INGRESS_MAX_LENGTH) : '';
};
