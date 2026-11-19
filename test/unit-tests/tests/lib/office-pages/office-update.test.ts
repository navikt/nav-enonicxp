import { request } from '/lib/http-client';
import * as contentLib from '/lib/xp/content';
import {
    fetchAllOfficeDataFromNorg,
    mergeOfficeDataWithPageData,
    processAllOffices,
} from '@navno-app/lib/office-pages/office-update';
import { OfficeRawNORGData } from '@navno-app/lib/office-pages/office-raw-norg-data';
import { OfficeTypes } from '@navno-app/lib/office-pages/types';

jest.mock('/lib/http-client', () => ({
    request: jest.fn(),
}));

jest.mock('/lib/xp/common', () => ({
    sanitize: jest.fn((value: string) => value.toLowerCase().replace(/\s+/g, '-')),
}));

jest.mock('../../../../../src/main/resources/lib/utils/object-utils', () => ({
    createObjectChecksum: jest.fn(() => 'checksum'),
}));

jest.mock('/lib/xp/content', () => ({
    create: jest.fn(),
    delete: jest.fn(),
    get: jest.fn(),
    getChildren: jest.fn(),
    getOutboundDependencies: jest.fn(),
    modify: jest.fn(),
    move: jest.fn(),
    publish: jest.fn(),
    unpublish: jest.fn(),
}));

const requestMock = request as jest.MockedFunction<typeof request>;
const contentMock = contentLib as jest.Mocked<typeof contentLib>;

const httpResponse = (body: string): ReturnType<typeof request> =>
    ({ status: 200, body }) as ReturnType<typeof request>;

const officeData = (enhetNr: string, navn: string): OfficeRawNORGData =>
    ({
        enhetNr,
        navn,
        telefonnummer: '',
        telefonnummerKommentar: '',
        postadresse: {},
        besoeksadresse: {},
        spesielleOpplysninger: '',
        brukerkontakt: {},
    }) as OfficeRawNORGData;

const officePage = (id: string, enhetNr: string, type: OfficeTypes) =>
    ({
        _id: id,
        _name: id,
        _path: `/www.nav.no/kontor/${id}`,
        displayName: id,
        type: 'no.nav.navno:office-page',
        data: {
            officeNorgData: {
                data: {
                    enhetNr,
                    type,
                },
            },
        },
    }) as never;

describe('Office update', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        contentMock.publish.mockReturnValue({ failedContents: [] } as never);
        contentMock.getOutboundDependencies.mockReturnValue([] as never);
    });

    test('preserves editorial fields when merging imported office data', () => {
        const result = mergeOfficeDataWithPageData({
            pageData: {
                officeNorgData: {
                    _selected: 'data',
                    data: {
                        enhetNr: '1001',
                        type: OfficeTypes.HMS,
                        phoneHeader: 'Ring oss',
                        beliggenhet: {
                            hideLocation: true,
                        },
                    },
                },
            } as never,
            officeData: {
                enhetNr: '1001',
                navn: 'Updated office',
                type: OfficeTypes.HMS,
                beliggenhet: {
                    gatenavn: 'Norggata',
                },
            } as never,
            checksum: 'new-checksum',
        });
        const mergedOfficeData = result.officeNorgData.data as typeof result.officeNorgData.data & {
            phoneHeader?: string;
            beliggenhet?: {
                hideLocation?: boolean;
            };
        };

        expect(mergedOfficeData.phoneHeader).toBe('Ring oss');
        expect(mergedOfficeData.beliggenhet?.hideLocation).toBe(true);
        expect(mergedOfficeData.beliggenhet?.gatenavn).toBe('Norggata');
    });

    test('imports configured office types and enhet 4534 only from KONTROLL', () => {
        const overview = [
            { enhetId: '1', enhetNr: '1001', navn: 'HMS', type: OfficeTypes.HMS },
            { enhetId: '2', enhetNr: '1002', navn: 'ALS', type: OfficeTypes.ALS },
            { enhetId: '3', enhetNr: '1003', navn: 'Okonomi', type: OfficeTypes.OKONOMI },
            {
                enhetId: '4',
                enhetNr: '1004',
                navn: 'Oppfolging utland',
                type: OfficeTypes.OPPFUTLAND,
            },
            {
                enhetId: '5',
                enhetNr: '4534',
                navn: 'Registerforvaltning',
                type: OfficeTypes.KONTROLL,
            },
            {
                enhetId: '6',
                enhetNr: '9999',
                navn: 'Annen kontroll',
                type: OfficeTypes.KONTROLL,
            },
        ];

        requestMock
            .mockReturnValueOnce(httpResponse(JSON.stringify(overview)))
            .mockReturnValueOnce(
                httpResponse(
                    JSON.stringify([
                        officeData('1001', 'HMS'),
                        officeData('1002', 'ALS'),
                        officeData('1003', 'Okonomi'),
                        officeData('1004', 'Oppfolging utland'),
                        officeData('4534', 'Registerforvaltning'),
                    ])
                )
            )
            .mockReturnValueOnce(httpResponse('[]'));

        const result = fetchAllOfficeDataFromNorg();
        const informationRequest = requestMock.mock.calls[1][0];

        expect(JSON.parse(informationRequest.body as string)).toEqual([
            '1001',
            '1002',
            '1003',
            '1004',
            '4534',
        ]);
        expect(result?.find((office) => office.enhetNr === '4534')?.type).toBe(
            OfficeTypes.KONTROLL
        );
        expect(result?.find((office) => office.enhetNr === '4534')?.hidePhoneInformation).toBe(
            false
        );
        expect(result?.find((office) => office.enhetNr === '1003')?.hidePhoneInformation).toBe(
            true
        );
        expect(result?.find((office) => office.enhetNr === '1004')?.hidePhoneInformation).toBe(
            true
        );
        expect(result?.some((office) => office.enhetNr === '9999')).toBe(false);
    });

    test('aborts the import when office data cannot be matched to a supported type', () => {
        const overview = [
            {
                enhetId: '1',
                enhetNr: '1001',
                navn: 'Okonomi',
                type: OfficeTypes.OKONOMI,
            },
        ];

        requestMock
            .mockReturnValueOnce(httpResponse(JSON.stringify(overview)))
            .mockReturnValueOnce(httpResponse(JSON.stringify([officeData('9999', 'Unknown')])))
            .mockReturnValueOnce(httpResponse('[]'));

        expect(fetchAllOfficeDataFromNorg()).toBeNull();
    });

    test('aborts when NORG returns an empty list and existing office pages remain', () => {
        const officeA = officePage('existing-a', '1001', OfficeTypes.HMS);
        const officeB = officePage('existing-b', '1002', OfficeTypes.HMS);

        contentMock.getChildren
            .mockReturnValueOnce({ hits: [officeA, officeB] } as never)
            .mockReturnValueOnce({ hits: [] } as never);
        contentMock.get.mockImplementation(({ key }) =>
            key === 'existing-a' ? officeA : key === 'existing-b' ? officeB : null
        );

        processAllOffices([]);

        expect(contentMock.unpublish).not.toHaveBeenCalled();
        expect(contentMock.delete).not.toHaveBeenCalled();
    });

    test('aborts when the fetched list is less than half of the existing offices', () => {
        const existingOffices: any[] = [
            officePage('existing-1', '1001', OfficeTypes.HMS),
            officePage('existing-2', '1002', OfficeTypes.HMS),
            officePage('existing-3', '1003', OfficeTypes.HMS),
            officePage('existing-4', '1004', OfficeTypes.HMS),
        ];

        contentMock.getChildren
            .mockReturnValueOnce({ hits: existingOffices } as never)
            .mockReturnValueOnce({ hits: [] } as never);
        contentMock.get.mockImplementation(
            ({ key }: { key: string }) =>
                existingOffices.find((office) => office._id === key) ?? null
        );

        processAllOffices([
            {
                enhetNr: '1001',
                navn: 'Existing office',
                type: OfficeTypes.HMS,
            } as never,
        ]);

        expect(contentMock.unpublish).not.toHaveBeenCalled();
        expect(contentMock.delete).not.toHaveBeenCalled();
    });

    test('still deletes stale office pages when the fetched list is at least half of the existing offices', () => {
        const staleOfficeA = officePage('stale-a', '2001', OfficeTypes.HMS);
        const staleOfficeB = officePage('stale-b', '2002', OfficeTypes.HMS);
        const staleOfficeC = officePage('stale-c', '2003', OfficeTypes.HMS);
        const staleOfficeD = officePage('stale-d', '2004', OfficeTypes.HMS);
        const staleOffices: any[] = [staleOfficeA, staleOfficeB, staleOfficeC, staleOfficeD];

        contentMock.getChildren
            .mockReturnValueOnce({ hits: staleOffices } as never)
            .mockReturnValueOnce({ hits: [] } as never);
        contentMock.get.mockImplementation(
            ({ key }: { key: string }) => staleOffices.find((office) => office._id === key) ?? null
        );
        contentMock.create.mockImplementation(
            ({ name }: { name?: string }) => ({ _id: `${name ?? 'new'}-created` }) as any
        );

        processAllOffices([
            { enhetNr: '3001', navn: 'New office 1', type: OfficeTypes.HMS } as never,
            { enhetNr: '3002', navn: 'New office 2', type: OfficeTypes.HMS } as never,
        ]);

        expect(contentMock.delete).toHaveBeenCalledWith({ key: 'stale-a' });
        expect(contentMock.delete).toHaveBeenCalledWith({ key: 'stale-b' });
        expect(contentMock.delete).toHaveBeenCalledWith({ key: 'stale-c' });
        expect(contentMock.delete).toHaveBeenCalledWith({ key: 'stale-d' });
    });

    test('does not overwrite an editorial office at an imported office path', () => {
        const editorialOffice = officePage('editorial-office', '0000', OfficeTypes.REDAKSJONELT);

        contentMock.getChildren.mockReturnValue({ hits: [] } as never);
        contentMock.get.mockReturnValue(editorialOffice);

        processAllOffices([
            {
                enhetNr: '1001',
                navn: 'Editorial office',
                type: OfficeTypes.HMS,
            } as never,
        ]);

        expect(contentMock.create).not.toHaveBeenCalled();
        expect(contentMock.delete).not.toHaveBeenCalled();
        expect(contentMock.publish).not.toHaveBeenCalled();
    });

    test('does not process a Norg office with the same number as an editorial office', () => {
        const editorialOffice = officePage('custom-name', '1001', OfficeTypes.REDAKSJONELT);

        contentMock.getChildren
            .mockReturnValueOnce({ hits: [editorialOffice] } as never)
            .mockReturnValueOnce({ hits: [] } as never);

        processAllOffices([
            {
                enhetNr: '1001',
                navn: 'Norg name',
                type: OfficeTypes.HMS,
            } as never,
        ]);

        expect(contentMock.get).not.toHaveBeenCalled();
        expect(contentMock.create).not.toHaveBeenCalled();
        expect(contentMock.delete).not.toHaveBeenCalled();
        expect(contentMock.publish).not.toHaveBeenCalled();
    });
});
