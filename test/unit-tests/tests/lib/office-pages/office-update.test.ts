import { request } from '/lib/http-client';
import { fetchAllOfficeDataFromNorg } from '@navno-app/lib/office-pages/office-update';
import { OfficeRawNORGData } from '@navno-app/lib/office-pages/office-raw-norg-data';
import { OfficeTypes } from '@navno-app/lib/office-pages/types';

jest.mock('/lib/http-client', () => ({
    request: jest.fn(),
}));

const requestMock = request as jest.MockedFunction<typeof request>;

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

describe('Office update', () => {
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
});