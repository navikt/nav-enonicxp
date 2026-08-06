import { request } from '/lib/http-client';
import * as contentLib from '/lib/xp/content';
import {
    fetchAllOfficeDataFromNorg,
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

jest.mock('/lib/xp/content', () => ({
    create: jest.fn(),
    delete: jest.fn(),
    get: jest.fn(),
    getChildren: jest.fn(),
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
        expect(result?.some((office) => office.enhetNr === '9999')).toBe(false);
    });

    test('never deletes editorially managed offices during stale cleanup', () => {
        const editorialOffice = officePage('editorial-office', '0000', OfficeTypes.REDAKSJONELT);
        const staleNorgOffice = officePage('stale-office', '1001', OfficeTypes.HMS);

        contentMock.getChildren
            .mockReturnValueOnce({ hits: [editorialOffice, staleNorgOffice] } as never)
            .mockReturnValueOnce({ hits: [] } as never);
        contentMock.get.mockImplementation(({ key }) =>
            key === 'stale-office' ? staleNorgOffice : null
        );

        processAllOffices([]);

        expect(contentMock.delete).toHaveBeenCalledWith({ key: 'stale-office' });
        expect(contentMock.delete).not.toHaveBeenCalledWith({ key: 'editorial-office' });
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
