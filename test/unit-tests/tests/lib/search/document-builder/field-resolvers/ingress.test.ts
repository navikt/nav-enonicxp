import {
    buildSearchDocumentOfficeIngress,
} from '@navno-app/lib/search/document-builder/field-resolvers/ingress';
import { OfficeContent, OfficeTypes } from '@navno-app/lib/office-pages/types';

const officeContent = ({
    type,
    navn,
    metaDescription,
    publikumsmottak,
}: {
    type: OfficeTypes;
    navn?: string;
    metaDescription?: string;
    publikumsmottak?: unknown[];
}) =>
    ({
        _id: 'office-id',
        type: 'no.nav.navno:office-page',
        displayName: 'Office display name',
        data: {
            metaDescription,
            officeNorgData: {
                data: {
                    type,
                    navn,
                    brukerkontakt: {
                        publikumsmottak,
                    },
                },
            },
        },
    }) as OfficeContent;

describe('Office search document ingress', () => {
    test.each([
        OfficeTypes.HMS,
        OfficeTypes.ALS,
        OfficeTypes.OKONOMI,
        OfficeTypes.OPPFUTLAND,
        OfficeTypes.KONTROLL,
        OfficeTypes.REDAKSJONELT,
    ])('uses office description for non-local office type %s', (type) => {
        const content = officeContent({
            type,
            navn: 'Office name',
            metaDescription: 'Office description',
        });

        expect(buildSearchDocumentOfficeIngress(content)).toBe('Office description');
    });

    test('uses default ingress for a local office without a public reception', () => {
        const content = officeContent({
            type: OfficeTypes.LOKAL,
            navn: 'Local office',
        });

        expect(buildSearchDocumentOfficeIngress(content)).toBe('Kontorinformasjon');
    });

    test('uses the location for a local office with a public reception', () => {
        const content = officeContent({
            type: OfficeTypes.LOKAL,
            publikumsmottak: [
                {
                    besoeksadresse: {
                        poststed: 'OSLO',
                    },
                },
            ],
        });

        expect(buildSearchDocumentOfficeIngress(content)).toBe('Lokalkontor i Oslo');
    });
});
