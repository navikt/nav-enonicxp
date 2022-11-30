import { buildSelectorQuery } from './contentSelector';

const mockContent = {
    _id: 'asdf',
    data: {
        myData: 'qwer',
    },
};

jest.mock('/lib/xp/portal', () => ({
    getContent: () => mockContent,
}));

describe('Custom content selector query', () => {
    test('Should return query with _id value', () => {
        const query = buildSelectorQuery('Query with id: {_id}');
        expect(query).toEqual(`Query with id: ${mockContent._id}`);
    });

    test('Should return query with nested data.myData value', () => {
        const query = buildSelectorQuery('Query with nested data: {data.myData}');
        expect(query).toEqual(`Query with nested data: ${mockContent.data.myData}`);
    });
});
