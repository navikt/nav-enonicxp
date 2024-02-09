import { Content } from '/lib/xp/content';
import { OfficeContent } from '../../../../office-pages/types';
import { forceArray } from '../../../../utils/array-utils';
import { OfficeBranch } from '../../../../../site/content-types/office-branch/office-branch';

const DEFAULT_PHONE = '55 55 33 33';

const buildAddressElement = (address: NonNullable<OfficeBranch['postadresse']>) => {
    const {
        gatenavn = '',
        husnummer = '',
        husbokstav = '',
        postnummer = '',
        poststed = '',
    } = address;

    const husNrOgBokstav = husnummer || husbokstav ? ` ${husnummer}${husbokstav}` : '';

    return `<b>Publikumsmottak: </b>${gatenavn}${husNrOgBokstav}, ${postnummer} ${poststed.toUpperCase()}`;
};

const buildOfficeInfoLegacy = (content: Content<'no.nav.navno:office-information'>) => {
    const phone = content.data.kontaktinformasjon?.telefonnummer || DEFAULT_PHONE;
    const phoneElement = `<b>Telefon:</b> ${phone}`;

    const address = forceArray(content.data.kontaktinformasjon?.publikumsmottak).find(
        (mottak) => mottak?.besoeksadresse?.type === 'stedsadresse'
    )?.besoeksadresse;

    if (!address) {
        return phoneElement;
    }

    const addressElement = buildAddressElement(address);

    return `<b>${phone}</b><br/>`;
};

export const buildOfficeIngress = (content: OfficeContent): string => {
    if (content.type === 'no.nav.navno:office-information') {
        return buildOfficeInfoLegacy(content);
    }

    return '';
};
