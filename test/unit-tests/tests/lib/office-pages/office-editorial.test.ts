import {
    getOfficeEditorialType,
    OfficeEditorialTypes,
} from '@navno-app/lib/office-pages/office-editorial';
import { OfficeTypes } from '@navno-app/lib/office-pages/types';

describe('Office editorial type', () => {
    test.each([
        [OfficeTypes.LOKAL, false, OfficeEditorialTypes.LOKAL],
        [OfficeTypes.ALS, false, OfficeEditorialTypes.ALS],
        [OfficeTypes.OKONOMI, false, OfficeEditorialTypes.ENHET],
        [OfficeTypes.OPPFUTLAND, false, OfficeEditorialTypes.ENHET],
        [OfficeTypes.KONTROLL, false, OfficeEditorialTypes.ENHET],
        [OfficeTypes.REDAKSJONELT, true, OfficeEditorialTypes.ENHET],
        [OfficeTypes.REDAKSJONELT, false, null],
        [OfficeTypes.HMS, false, null],
    ])('maps %s with unit opt-in %s to %s', (officeType, useUnitEditorialPage, expected) => {
        expect(getOfficeEditorialType(officeType, useUnitEditorialPage)).toBe(expected);
    });
});