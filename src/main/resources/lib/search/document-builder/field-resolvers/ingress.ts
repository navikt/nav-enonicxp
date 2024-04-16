import { OfficeContent } from '../../../office-pages/types';
import { forceArray } from '../../../utils/array-utils';
import { OfficePage } from '@xp-types/site/content-types/office-page';

type Publikumsmottak = NonNullable<
    NonNullable<OfficePage['officeNorgData']['data']['brukerkontakt']>['publikumsmottak']
>;

const DEFAULT_PHONE = '55 55 33 33';

const buildPhoneElement = (phoneNr?: string) =>
    `<strong>Telefon:</strong> ${phoneNr || DEFAULT_PHONE}`;

const buildAddressElement = (mottakList?: Publikumsmottak) => {
    const address = forceArray(mottakList).find(
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
    const isLegacyType = content.type === 'no.nav.navno:office-information';
    const phoneElement = buildPhoneElement(
        isLegacyType ? content.data.kontaktinformasjon?.telefonnummer : DEFAULT_PHONE
    );

    if (content.type === 'no.nav.navno:office-information') {
        const addressElement = buildAddressElement(
            content.data.kontaktinformasjon?.publikumsmottak
        );

        return addressElement ? `${phoneElement}<br/>${addressElement}` : phoneElement;
    }

    const officeData = content.data.officeNorgData?.data;
    const addressElement = buildAddressElement(officeData.brukerkontakt?.publikumsmottak);

    return addressElement ? `${phoneElement}<br/>${addressElement}` : phoneElement;
};

const withoutTable = (text: string) => text.split('<table')[0];

export const buildSearchDocumentIngress = (ingressTextRaw?: string) => {
    return ingressTextRaw ? withoutTable(ingressTextRaw) : '';
};
