jest.mock('/lib/xp/context', () => ({
    get: jest.fn(() => ({ attributes: {} })),
    run: jest.fn((context: unknown, callback: () => unknown) => callback()),
}));

import * as contextLib from '/lib/xp/context';
import { runInContext } from '@navno-app/lib/context/run-in-context';

const getRunContext = () => jest.mocked(contextLib.run).mock.calls[0][0];

describe('runInContext', () => {
    // Content in the layers grants read access only to project roles, on both branches
    test.each(['draft', 'master'] as const)(
        'gives the system user the viewer role for the layer project on %s',
        (branch) => {
            runInContext({ repository: 'com.enonic.cms.navno-engelsk', branch }, () => null);

            expect(getRunContext()).toMatchObject({
                user: { login: 'system-user', idProvider: 'system' },
                principals: ['role:cms.project.navno-engelsk.viewer'],
                repository: 'com.enonic.cms.navno-engelsk',
                branch,
            });
        }
    );

    test('gives no project role outside content repos', () => {
        runInContext({ repository: 'system-repo', branch: 'master' }, () => null);

        expect(getRunContext()).not.toHaveProperty('principals');
    });
});
