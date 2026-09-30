import { OfficeTypes } from './types';

export enum OfficeEditorialTypes {
    LOKAL = 'LOKAL',
    ALS = 'ALS',
    ENHET = 'ENHET',
}

type OfficeType = `${OfficeTypes}`;

const unitOfficeTypes: ReadonlySet<string> = new Set([
    OfficeTypes.OKONOMI,
    OfficeTypes.OPPFUTLAND,
    OfficeTypes.KONTROLL,
]);

export const getOfficeEditorialType = (
    officeType: OfficeType,
    useUnitEditorialPage?: boolean
): OfficeEditorialTypes | null => {
    if (officeType === OfficeTypes.LOKAL) {
        return OfficeEditorialTypes.LOKAL;
    }

    if (officeType === OfficeTypes.ALS) {
        return OfficeEditorialTypes.ALS;
    }

    if (
        unitOfficeTypes.has(officeType) ||
        (officeType === OfficeTypes.REDAKSJONELT && useUnitEditorialPage)
    ) {
        return OfficeEditorialTypes.ENHET;
    }

    return null;
};