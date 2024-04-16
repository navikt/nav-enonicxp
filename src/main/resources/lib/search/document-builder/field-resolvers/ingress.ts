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

    const addresses = forceArray(publikumsmottak).reduce<string[]>((acc, mottak) => {
        if (mottak.besoeksadresse?.type !== 'stedsadresse') {
            return acc;
        }

        const {
            gatenavn = '',
            husnummer = '',
            husbokstav = '',
            postnummer = '',
            poststed = '',
        } = mottak.besoeksadresse;

        const husNrOgBokstav = husnummer || husbokstav ? ` ${husnummer}${husbokstav}` : '';
        const address = `${gatenavn}${husNrOgBokstav}, ${postnummer} ${poststed.toUpperCase()}`;

        acc.push(address);

        return acc;
    }, []);

    if (addresses.length === 0) {
        return null;
    }

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
    return ingressTextRaw ? withoutTable(ingressTextRaw) : '';
};
