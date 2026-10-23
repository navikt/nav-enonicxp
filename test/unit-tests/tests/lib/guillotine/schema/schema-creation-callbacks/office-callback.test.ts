import { CreateObjectTypeParams } from '/lib/graphql';
import * as contentLib from '/lib/xp/content';
import { officeCallback } from '@navno-app/lib/guillotine/schema/schema-creation-callbacks/office-callback';
import { OfficeTypes } from '@navno-app/lib/office-pages/types';

jest.mock('/lib/graphql', () => ({
    __esModule: true,
    default: {
        GraphQLID: {},
        reference: jest.fn(() => ({})),
    },
}));

jest.mock('/lib/xp/content', () => ({
    get: jest.fn(),
    query: jest.fn(),
}));

const contentMock = contentLib as jest.Mocked<typeof contentLib>;

const resolveEditorial = (contentId = 'office-id') => {
    const params = { fields: {} } as CreateObjectTypeParams;
    officeCallback({} as never, params);

    return params.fields.editorial.resolve!({
        args: { contentId },
        context: {},
        source: {},
    });
};

const officePage = ({
    type,
    language,
    skriftspraak,
    useUnitEditorialPage,
}: {
    type: OfficeTypes;
    language?: string;
    skriftspraak?: string;
    useUnitEditorialPage?: boolean;
}) =>
    ({
        type: 'no.nav.navno:office-page',
        language,
        data: {
            useUnitEditorialPage,
            officeNorgData: {
                data: {
                    type,
                    brukerkontakt: { skriftspraak },
                },
            },
        },
    }) as never;

describe('Office editorial resolver', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('resolves the ENHET editorial page using the content language', () => {
        const editorialPage = { _id: 'editorial-page' };
        contentMock.get.mockReturnValue(
            officePage({
                type: OfficeTypes.REDAKSJONELT,
                language: 'en',
                skriftspraak: 'NN',
                useUnitEditorialPage: true,
            })
        );
        contentMock.query.mockReturnValue({ count: 1, hits: [editorialPage] } as never);

        expect(resolveEditorial()).toBe(editorialPage);
        expect(contentMock.query).toHaveBeenCalledWith(
            expect.objectContaining({
                query: '_path LIKE "*/www.nav.no/kontor/editorial-mappe/*"',
                filters: {
                    boolean: {
                        must: [
                            { hasValue: { field: 'language', values: ['en'] } },
                            { hasValue: { field: 'data.officeType', values: ['ENHET'] } },
                        ],
                    },
                },
            })
        );
    });

    test('resolves ALS editorial content below arbeidsgiver with Norg language fallback', () => {
        contentMock.get.mockReturnValue(officePage({ type: OfficeTypes.ALS, skriftspraak: 'nn' }));
        contentMock.query.mockReturnValue({ count: 1, hits: [{ _id: 'als-editorial' }] } as never);

        resolveEditorial();

        expect(contentMock.query).toHaveBeenCalledWith(
            expect.objectContaining({
                query: '_path LIKE "*/www.nav.no/arbeidsgiver/editorial-mappe/*"',
                filters: {
                    boolean: {
                        must: [
                            { hasValue: { field: 'language', values: ['nn'] } },
                            { hasValue: { field: 'data.officeType', values: ['ALS'] } },
                        ],
                    },
                },
            })
        );
    });

    test('does not query editorial content for unsupported office types', () => {
        contentMock.get.mockReturnValue(officePage({ type: OfficeTypes.HMS }));

        expect(resolveEditorial()).toBeNull();
        expect(contentMock.query).not.toHaveBeenCalled();
    });
});
