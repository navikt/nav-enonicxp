import { Content } from '/lib/xp/content';

jest.mock('/lib/xp/content', () => ({
    get: () => ({}),
    query: () => ({ hits: [] }),
}));

describe('Global values references', () => {
    test('test', () => {
        expect(true);
    });
});
