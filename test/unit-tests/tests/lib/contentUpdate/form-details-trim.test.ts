import { buildTrimmedFormDetailsData } from '@navno-app/lib/contentUpdate/form-details-trim';
import { FormDetails } from '@xp-types/site/content-types/form-details';

const baseData: FormDetails = {
    title: 'Tittel',
    audience: {
        _selected: ['person'],
        person: {},
        employer: {},
        provider: { provider_audience: 'doctor' },
        other: {},
    },
    formType: [],
};

const makeExternalVariation = (label: string, url: string, formNumber?: string) => ({
    label,
    link: {
        _selected: 'external' as const,
        external: { url, formNumber },
    },
});

const makeInternalVariation = (label: string, target: string) => ({
    label,
    link: {
        _selected: 'internal' as const,
        internal: { target },
    },
});

describe('buildTrimmedFormDetailsData', () => {
    describe('Top-level text fields', () => {
        test('trims leading and trailing whitespace from title', () => {
            const { trimmedData, hasChanges } = buildTrimmedFormDetailsData({
                ...baseData,
                title: '  Tittel  ',
            });
            expect(trimmedData.title).toBe('Tittel');
            expect(hasChanges).toBe(true);
        });

        test('trims longTitle when present', () => {
            const { trimmedData, hasChanges } = buildTrimmedFormDetailsData({
                ...baseData,
                longTitle: ' Lang tittel ',
            });
            expect(trimmedData.longTitle).toBe('Lang tittel');
            expect(hasChanges).toBe(true);
        });

        test('leaves longTitle undefined when not set', () => {
            const { trimmedData, hasChanges } = buildTrimmedFormDetailsData(baseData);
            expect(trimmedData.longTitle).toBeUndefined();
            expect(hasChanges).toBe(false);
        });

        test('trims languageDisclaimer', () => {
            const { trimmedData, hasChanges } = buildTrimmedFormDetailsData({
                ...baseData,
                languageDisclaimer: '\tTekst om språk\n',
            });
            expect(trimmedData.languageDisclaimer).toBe('Tekst om språk');
            expect(hasChanges).toBe(true);
        });

        test('trims each formNumber in the array', () => {
            const { trimmedData, hasChanges } = buildTrimmedFormDetailsData({
                ...baseData,
                formNumbers: [' NAV 01-01.00 ', ' NAV 02-02.00'],
            });
            expect(trimmedData.formNumbers).toEqual(['NAV 01-01.00', 'NAV 02-02.00']);
            expect(hasChanges).toBe(true);
        });

        test('trims a single formNumber string', () => {
            const { trimmedData, hasChanges } = buildTrimmedFormDetailsData({
                ...baseData,
                formNumbers: ' NAV 01-01.00 ',
            });
            expect(trimmedData.formNumbers).toBe('NAV 01-01.00');
            expect(hasChanges).toBe(true);
        });

        test('returns undefined formNumbers when not set', () => {
            const { trimmedData } = buildTrimmedFormDetailsData(baseData);
            expect(trimmedData.formNumbers).toBeUndefined();
        });
    });

    describe('Variation labels and external links', () => {
        test('trims label in application variation', () => {
            const { trimmedData, hasChanges } = buildTrimmedFormDetailsData({
                ...baseData,
                formType: [
                    {
                        _selected: 'application',
                        application: {
                            variations: [makeExternalVariation(' Søk digitalt ', 'https://nav.no')],
                        },
                    },
                ],
            });

            const ft = trimmedData.formType[0] as Extract<
                FormDetails['formType'][number],
                { _selected: 'application' }
            >;
            expect(ft.application.variations![0].label).toBe('Søk digitalt');
            expect(hasChanges).toBe(true);
        });

        test('trims external url in variation link', () => {
            const { trimmedData, hasChanges } = buildTrimmedFormDetailsData({
                ...baseData,
                formType: [
                    {
                        _selected: 'complaint',
                        complaint: {
                            variations: [
                                {
                                    ...makeExternalVariation('Klage', ' https://nav.no/klage '),
                                    type: 'complaint',
                                },
                            ],
                        },
                    },
                ],
            });

            const ft = trimmedData.formType[0] as Extract<
                FormDetails['formType'][number],
                { _selected: 'complaint' }
            >;
            type ComplaintVariation = NonNullable<typeof ft.complaint.variations>[number];
            const link = ft.complaint.variations![0].link as Extract<
                ComplaintVariation['link'],
                { _selected: 'external' }
            >;
            expect(link.external.url).toBe('https://nav.no/klage');
            expect(hasChanges).toBe(true);
        });

        test('trims formNumber in external link', () => {
            const { trimmedData, hasChanges } = buildTrimmedFormDetailsData({
                ...baseData,
                formType: [
                    {
                        _selected: 'addendum',
                        addendum: {
                            variations: [
                                makeExternalVariation('Ettersend', 'https://nav.no', ' NAV 10-10.00 '),
                            ],
                        },
                    },
                ],
            });

            const ft = trimmedData.formType[0] as Extract<
                FormDetails['formType'][number],
                { _selected: 'addendum' }
            >;
            type AddendumVariation = NonNullable<typeof ft.addendum.variations>[number];
            const link = ft.addendum.variations![0].link as Extract<
                AddendumVariation['link'],
                { _selected: 'external' }
            >;
            expect(link.external.formNumber).toBe('NAV 10-10.00');
            expect(hasChanges).toBe(true);
        });

        test('does not touch internal link target', () => {
            const target = 'abc-123';
            const { trimmedData, hasChanges } = buildTrimmedFormDetailsData({
                ...baseData,
                formType: [
                    {
                        _selected: 'application',
                        application: {
                            variations: [makeInternalVariation('Send inn', target)],
                        },
                    },
                ],
            });

            const ft = trimmedData.formType[0] as Extract<
                FormDetails['formType'][number],
                { _selected: 'application' }
            >;
            type ApplicationVariation = NonNullable<typeof ft.application.variations>[number];
            const link = ft.application.variations![0].link as Extract<
                ApplicationVariation['link'],
                { _selected: 'internal' }
            >;
            expect(link.internal.target).toBe(target);
            expect(hasChanges).toBe(false);
        });

        test('handles variations being undefined', () => {
            const { trimmedData, hasChanges } = buildTrimmedFormDetailsData({
                ...baseData,
                formType: [
                    {
                        _selected: 'application',
                        application: {},
                    },
                ],
            });

            const ft = trimmedData.formType[0] as Extract<
                FormDetails['formType'][number],
                { _selected: 'application' }
            >;
            expect(ft.application.variations).toBeUndefined();
            expect(hasChanges).toBe(false);
        });
    });

    describe('No-op when already trimmed', () => {
        test('reports no changes when all fields are already trimmed', () => {
            const { hasChanges } = buildTrimmedFormDetailsData({
                ...baseData,
                title: 'Allerede trimmet',
                longTitle: 'Lang tittel',
                formNumbers: ['NAV 01-01.00'],
                formType: [
                    {
                        _selected: 'application',
                        application: {
                            variations: [makeExternalVariation('Søk', 'https://nav.no')],
                        },
                    },
                ],
            });

            expect(hasChanges).toBe(false);
        });
    });
});
