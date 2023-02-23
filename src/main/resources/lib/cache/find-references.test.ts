import { Content } from '/lib/xp/content';

jest.mock('/lib/xp/content', () => ({
    get: () => ({}),
    query: () => ({ hits: [] }),
}));

describe('Find references', () => {
    test('test', () => {
        expect(true);
    });
});
