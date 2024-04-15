import { OfficeContent } from '../../../office-pages/types';
import { forceArray } from '../../../utils/array-utils';
import { OfficeBranch } from '@xp-types/site/content-types/office-branch';

type Publikumsmottak = NonNullable<NonNullable<OfficeBranch['brukerkontakt']>['publikumsmottak']>;

const DEFAULT_PHONE = '55 55 33 33';

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

    const address = forceArray(publikumsmottak).find(
        (mottak) => mottak.besoeksadresse?.type === 'stedsadresse'
    )?.besoeksadresse;

    if (!address) {
        return null;
    }

    const {
        gatenavn = '',
        husnummer = '',
        husbokstav = '',
        postnummer = '',
        poststed = '',
    } = address;

    const husNrOgBokstav = husnummer || husbokstav ? ` ${husnummer}${husbokstav}` : '';

    return `<strong>Publikumsmottak:</strong> ${gatenavn}${husNrOgBokstav}, ${postnummer} ${poststed.toUpperCase()}`;
};

export const buildSearchDocumentOfficeIngress = (content: OfficeContent): string => {
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
    return ingressTextRaw ? withoutTable(ingressTextRaw) : '';
};
