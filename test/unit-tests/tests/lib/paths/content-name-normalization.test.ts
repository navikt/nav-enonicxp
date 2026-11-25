import { RepoConnection } from '/lib/xp/node';
import { normalizeContentName } from '@navno-app/lib/paths/content-name-normalization';

jest.mock('/lib/xp/common', () => ({
    sanitize: (name: string) => name.toLowerCase().replace(/å/g, 'a').replace(/ /g, '-'),
}));

type TestNode = { _id: string; _name: string; _path: string; inherit?: string[] };

const createRepo = (nodes: TestNode[]) => {
    const byId = Object.fromEntries(nodes.map((node) => [node._id, node]));
    const paths = new Set(nodes.map((node) => node._path));

    return {
        get: (id: string) => byId[id] ?? null,
        exists: (path: string) => paths.has(path),
        move: jest.fn(() => true),
    };
};

const normalize = (repo: ReturnType<typeof createRepo>, id: string) =>
    normalizeContentName(repo as unknown as RepoConnection, id);

describe('Content name normalization', () => {
    test('renames content with invalid characters', () => {
        const repo = createRepo([
            { _id: '1', _name: 'Ås kontor', _path: '/content/www.nav.no/Ås kontor' },
        ]);

        expect(normalize(repo, '1')).toBe('as-kontor');
        expect(repo.move).toHaveBeenCalledWith({ source: '1', target: 'as-kontor' });
    });

    test('adds a number when a sibling already has the name', () => {
        const repo = createRepo([
            { _id: '1', _name: 'Ås', _path: '/content/www.nav.no/Ås' },
            { _id: '2', _name: 'as', _path: '/content/www.nav.no/as' },
            { _id: '3', _name: 'as-2', _path: '/content/www.nav.no/as-2' },
        ]);

        expect(normalize(repo, '1')).toBe('as-3');
        expect(repo.move).toHaveBeenCalledWith({ source: '1', target: 'as-3' });
    });

    test.each(['_templates', '__unnamed__8f3e2a', 'statistikk_kap', 'arsrapport-2025.pdf'])(
        'leaves the valid name %s alone',
        (name) => {
            const repo = createRepo([
                { _id: '1', _name: name, _path: `/content/www.nav.no/${name}` },
            ]);

            expect(normalize(repo, '1')).toBeNull();
            expect(repo.move).not.toHaveBeenCalled();
        }
    );

    test('leaves content outside /content alone', () => {
        const repo = createRepo([{ _id: '1', _name: 'Ås', _path: '/archive/Ås' }]);

        expect(normalize(repo, '1')).toBeNull();
        expect(repo.move).not.toHaveBeenCalled();
    });

    test('leaves layer content which inherits the name alone', () => {
        const repo = createRepo([
            {
                _id: '1',
                _name: 'Ås',
                _path: '/content/www.nav.no/Ås',
                inherit: ['CONTENT', 'NAME'],
            },
        ]);

        expect(normalize(repo, '1')).toBeNull();
        expect(repo.move).not.toHaveBeenCalled();
    });
});
