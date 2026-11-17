import { Content } from '/lib/xp/content';
import { omitPageForModify } from '@navno-app/lib/utils/content-utils';

describe('omitPageForModify', () => {
    test('Removes the page key, so contentLib.modify keeps the stored page', () => {
        const content = {
            _id: 'some-id',
            displayName: 'Some page',
            data: { foo: 'bar' },
            page: { type: 'page', descriptor: 'no.nav.navno:page-with-side-menus' },
        } as unknown as Content<any>;

        const result = omitPageForModify(content);

        // page: null or undefined would make XP remove the page
        expect('page' in result).toBe(false);
        expect(result).toEqual({
            _id: 'some-id',
            displayName: 'Some page',
            data: { foo: 'bar' },
        });
    });
});
