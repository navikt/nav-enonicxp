const mockGetContent = jest.fn();
const mockRepoGet = jest.fn();
const mockModify = jest.fn();
const mockContentGet = jest.fn();

let isInsideEditor = false;
let contextSwitchesInsideEditor = 0;

const switchContext = <T>(_options: unknown, callback: () => T): T => {
    if (isInsideEditor) {
        contextSwitchesInsideEditor++;
    }
    return callback();
};

jest.mock('/lib/xp/portal', () => ({ getContent: mockGetContent }), { virtual: true });
jest.mock('/lib/xp/content', () => ({ get: mockContentGet }), { virtual: true });
jest.mock('@navno-app/lib/controllers/frontend-proxy', () => ({ frontendProxy: jest.fn() }));
jest.mock('@navno-app/lib/utils/logging', () => ({
    logger: { info: jest.fn(), error: jest.fn() },
}));
jest.mock('@navno-app/lib/repos/repo-utils', () => ({
    getRepoConnection: () => ({ get: mockRepoGet, modify: mockModify }),
}));
jest.mock('@navno-app/lib/localization/locale-context', () => ({
    runInLocaleContext: switchContext,
}));
jest.mock('@navno-app/lib/paths/custom-paths/custom-path-content-validators', () => ({
    formIntermediateStepValidateCustomPath: () => false,
    // The real implementation queries for existing custom paths in a separate context
    formIntermediateStepGenerateCustomPath: () =>
        switchContext({ branch: 'master' }, () => '/start/skjema'),
}));
jest.mock('@navno-app/lib/constants', () => ({ CONTENT_LOCALE_DEFAULT: 'no' }));

import { Request } from '@enonic-types/core';
import { get } from '@navno-app/lib/controllers/form-intermediate-step-controller';

const externalStep = (formNumber?: string) => ({
    nextStep: { _selected: 'external', external: { formNumber } },
});

const englishContent = () => ({
    _id: 'step-id',
    type: 'no.nav.navno:form-intermediate-step',
    valid: true,
    language: 'en',
    data: { steps: [externalStep()] },
});

describe('form-intermediate-step controller', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        contextSwitchesInsideEditor = 0;
        mockGetContent.mockReturnValue(englishContent());
        mockRepoGet.mockReturnValue(englishContent());
        mockContentGet.mockReturnValue({ data: { steps: [externalStep('NAV 01-02.03')] } });
    });

    test('resolves custom path and form numbers before running the editor', () => {
        get({
            mode: 'edit',
            method: 'GET',
            repositoryId: 'com.enonic.cms.navno-engelsk',
        } as Request);

        expect(mockModify).toHaveBeenCalledTimes(1);
        const { editor } = mockModify.mock.calls[0][0];

        isInsideEditor = true;
        let edited;
        try {
            edited = editor(englishContent());
        } finally {
            isInsideEditor = false;
        }

        expect(contextSwitchesInsideEditor).toBe(0);
        expect(edited.data.customPath).toBe('/start/skjema');
        expect(edited.data.steps[0].nextStep.external.formNumber).toBe('NAV 01-02.03');
    });
});
