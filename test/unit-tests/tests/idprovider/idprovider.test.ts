import { autoLogin } from '@navno-app/idprovider/idprovider';
import { LAYERS_ANON_USER, LAYERS_ID_PROVIDER } from '@navno-app/lib/constants';

const mockLogin = jest.fn((_params: unknown) => ({ authenticated: true }));

jest.mock('/lib/xp/auth', () => ({ login: (params: unknown) => mockLogin(params) }), {
    virtual: true,
});

const ATTACHMENT_PATH = '/_/nn/attachment/inline/abc:123/fil.svg';

// XP8 does not set req.mode on id provider requests
const request = (overrides: Record<string, unknown> = {}) =>
    ({
        method: 'GET',
        branch: 'master',
        path: ATTACHMENT_PATH,
        url: `http://localhost:8080${ATTACHMENT_PATH}`,
        headers: {},
        ...overrides,
    }) as any;

describe('autoLogin', () => {
    test('logs in as the layers user for public files on master without request mode', () => {
        autoLogin(request());

        expect(mockLogin).toHaveBeenCalledTimes(1);
        expect(mockLogin).toHaveBeenCalledWith(
            expect.objectContaining({ user: LAYERS_ANON_USER, idProvider: LAYERS_ID_PROVIDER })
        );
    });

    test('logs in for images and files without a layer prefix', () => {
        autoLogin(request({ path: '/_/image/abc:123/width-100/bilde.png' }));
        autoLogin(request({ path: '/_/attachment/download/abc:123/fil.pdf' }));

        expect(mockLogin).toHaveBeenCalledTimes(2);
    });

    test('does not log in for draft or non-file requests', () => {
        autoLogin(request({ branch: 'draft' }));
        autoLogin(request({ path: '/_/nn/service/no.nav.navno/sitecontent' }));

        expect(mockLogin).not.toHaveBeenCalled();
    });
});
