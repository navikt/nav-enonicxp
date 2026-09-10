import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import { RepoNode } from '/lib/xp/node';
import {
    createCuratedExportManifest,
    createSanitizedSupplement,
    getAncestorContentPaths,
    sanitizeXmlString,
} from '@navno-app/lib/exports/curated-content-export';
import { findTargetContentAndLocale } from '@navno-app/services/sitecontent/common/find-target-content-and-locale';
import { getRepoConnection } from '@navno-app/lib/repos/repo-utils';
import { runInLocaleContext } from '@navno-app/lib/localization/locale-context';
import { queryAllLayersToRepoIdBuckets } from '@navno-app/lib/localization/layers-repo-utils/query-all-layers';
import { getCuratedSourceNode } from '@navno-app/lib/exports/curated-node-reader';

jest.mock('/lib/xp/content', () => ({
    get: jest.fn(),
    getOutboundDependencies: jest.fn(),
    query: jest.fn(),
}));
jest.mock('@navno-app/lib/contenttype-lists', () => ({
    dynamicPageContentTypes: ['no.nav.navno:main-article'],
}));
jest.mock('@navno-app/services/sitecontent/common/find-target-content-and-locale', () => ({
    findTargetContentAndLocale: jest.fn(),
}));
jest.mock('@navno-app/lib/localization/layers-data', () => ({
    getLayersData: () => ({
        localeToRepoIdMap: {
            no: 'com.enonic.cms.default',
            en: 'com.enonic.cms.navno-engelsk',
            nn: 'com.enonic.cms.navno-nynorsk',
        },
        repoIdToLocaleMap: {
            'com.enonic.cms.default': 'no',
            'com.enonic.cms.navno-engelsk': 'en',
            'com.enonic.cms.navno-nynorsk': 'nn',
        },
    }),
}));
jest.mock('@navno-app/lib/localization/locale-context', () => ({ runInLocaleContext: jest.fn() }));
jest.mock('@navno-app/lib/repos/repo-utils', () => ({ getRepoConnection: jest.fn() }));
jest.mock('@navno-app/lib/localization/layers-repo-utils/query-all-layers', () => ({
    queryAllLayersToRepoIdBuckets: jest.fn(),
}));
jest.mock('@navno-app/lib/exports/curated-node-reader', () => ({
    getCuratedSourceNode: jest.fn(),
}));
jest.mock('/lib/xp/project', () => ({
    list: () => [
        { id: 'default', language: 'no', parents: [] },
        { id: 'navno-engelsk', language: 'en', parents: ['default'] },
        { id: 'navno-nynorsk', language: 'nn', parents: ['default'] },
    ],
}));
jest.mock('/lib/xp/app', () => ({
    list: () => [
        { key: 'no.nav.navno', version: '1.0.0', started: true, system: false },
        { key: 'com.enonic.app.contentstudio', version: '5.3.2', started: true, system: false },
        { key: 'com.enonic.app.xpdoctor', version: '2.3.0', started: false, system: false },
        {
            key: 'com.enonic.xp.app.standardidprovider',
            version: '7.14.4',
            started: true,
            system: true,
        },
    ],
}));

type Branch = 'draft' | 'master';
type TestNode = RepoNode<Content>;
const repositories = {
    no: 'com.enonic.cms.default',
    en: 'com.enonic.cms.navno-engelsk',
    nn: 'com.enonic.cms.navno-nynorsk',
};
const nodes = new Map<string, TestNode>();
const references = new Map<string, string[]>();
let activeLocale: keyof typeof repositories = 'no';
let activeBranch: Branch = 'master';
const key = (repo: string, branch: Branch, id: string) => `${repo}:${branch}:${id}`;
const toContent = (node: TestNode) =>
    ({ ...node, _path: node._path.slice('/content'.length) }) as Content;
const getNode = (repo: string, branch: Branch, idOrPath: string) =>
    nodes.get(key(repo, branch, idOrPath)) ||
    Array.from(nodes.entries()).find(
        ([nodeKey, node]) => nodeKey.startsWith(`${repo}:${branch}:`) && node._path === idOrPath
    )?.[1] ||
    null;

const addNode = (
    id: string,
    path: string,
    {
        locale = 'no',
        branches = ['draft', 'master'],
        type = 'no.nav.navno:main-article',
    }: { locale?: keyof typeof repositories; branches?: Branch[]; type?: string } = {}
) => {
    branches.forEach((branch) => {
        const node = {
            _id: id,
            _path: `/content${path}`,
            _name: path.split('/').pop(),
            _versionKey: `${id}-${branch}-version`,
            _nodeType: 'content',
            _ts: '2026-09-08T00:00:00Z',
            type,
            data: {},
        } as TestNode;
        nodes.set(key(repositories[locale], branch, id), node);
    });
};

const setReferences = (
    id: string,
    branch: Branch,
    ids: string[],
    locale: keyof typeof repositories = 'no'
) => references.set(key(repositories[locale], branch, id), ids);

const selectPage = () => createCuratedExportManifest(['/www.nav.no/page'], 'page');

beforeEach(() => {
    nodes.clear();
    references.clear();
    activeLocale = 'no';
    activeBranch = 'master';
    (Object.keys(repositories) as Array<keyof typeof repositories>).forEach((locale) =>
        addNode('root', '/www.nav.no', { locale, type: 'portal:site' })
    );
    jest.mocked(runInLocaleContext).mockImplementation((context, callback) => {
        const previousLocale = activeLocale;
        const previousBranch = activeBranch;
        activeLocale = (context.locale || 'no') as typeof activeLocale;
        activeBranch = context.branch || 'master';
        try {
            return callback();
        } finally {
            activeLocale = previousLocale;
            activeBranch = previousBranch;
        }
    });
    jest.mocked(getRepoConnection).mockImplementation(
        ({ repoId, branch }) =>
            ({
                get: (input: string | { key: string }) =>
                    getNode(
                        repoId,
                        branch as Branch,
                        typeof input === 'string' ? input : input.key
                    ),
                query: ({ query }: { query: string }) => {
                    const prefix = query.match(/_path LIKE "(.*)\/\*"/)?.[1];
                    return {
                        total: Array.from(nodes.entries()).filter(
                            ([nodeKey, node]) =>
                                nodeKey.startsWith(`${repoId}:${branch}:`) &&
                                node._path.startsWith(`${prefix}/`)
                        ).length,
                    };
                },
            }) as unknown as ReturnType<typeof getRepoConnection>
    );
    jest.mocked(contentLib.get).mockImplementation(({ key: idOrPath }) => {
        const node = getNode(
            repositories[activeLocale],
            activeBranch,
            idOrPath.startsWith('/') ? `/content${idOrPath}` : idOrPath
        );
        return node ? toContent(node) : null;
    });
    jest.mocked(contentLib.getOutboundDependencies).mockImplementation(
        ({ key: id }) => references.get(key(repositories[activeLocale], activeBranch, id)) || []
    );
    jest.mocked(contentLib.query).mockImplementation(({ query }) => {
        const prefix = String(query).match(/_path LIKE "(.*)\/\*"/)?.[1];
        const hits = Array.from(nodes.entries())
            .filter(
                ([nodeKey, node]) =>
                    nodeKey.startsWith(`${repositories[activeLocale]}:${activeBranch}:`) &&
                    node._path.startsWith(`${prefix}/`)
            )
            .map(([, node]) => toContent(node));
        return { hits, total: hits.length, count: hits.length, start: 0 } as never;
    });
    jest.mocked(findTargetContentAndLocale).mockImplementation(({ path }) => {
        const node = getNode(repositories.no, 'master', `/content${path}`);
        return node ? { content: toContent(node), locale: 'no' } : null;
    });
    jest.mocked(queryAllLayersToRepoIdBuckets).mockReturnValue({});
    jest.mocked(getCuratedSourceNode).mockImplementation(({ repository, branch, contentId }) => ({
        formatVersion: 1,
        node: getNode(repository, branch, contentId)!,
        properties: [],
        binaryReferences: [],
        manualOrderValue: null,
    }));
});

test('retains valid supplementary Unicode and removes only XML-invalid characters', () => {
    expect(sanitizeXmlString('😀𐐷 før\u0002etter \ud800 \udc00 \uffff')).toBe('😀𐐷 føretter   ');
    expect(
        createSanitizedSupplement(
            {
                _id: 'valid',
                _path: '/content/www.nav.no/valid',
                data: { title: '😀' },
            } as TestNode,
            repositories.no,
            'draft'
        )
    ).toBeNull();
});

test('sanitizes attachment text without discarding attachments or their binary references', () => {
    const supplement = createSanitizedSupplement(
        {
            _id: 'media',
            _path: '/content/www.nav.no/media',
            attachment: [
                { binary: 'one.pdf', text: 'før\u0002etter' },
                { binary: 'two.pdf', text: '😀' },
            ],
        } as unknown as TestNode,
        repositories.no,
        'draft'
    );
    expect(supplement?.invalidValuePaths).toEqual(['attachment[0].text']);
    expect(supplement?.node.attachment).toEqual([
        { binary: 'one.pdf', text: 'føretter' },
        { binary: 'two.pdf', text: '😀' },
    ]);
});

test('returns all ancestors through the content root', () => {
    expect(getAncestorContentPaths('/content/www.nav.no/person/topic/page')).toEqual([
        '/content/www.nav.no',
        '/content/www.nav.no/person',
        '/content/www.nav.no/person/topic',
    ]);
});

test('includes pinned source versions and only selected graph nodes in page scope', () => {
    addNode('page', '/www.nav.no/page');
    addNode('unselected', '/www.nav.no/unselected');
    const manifest = selectPage();
    expect(manifest.entries.map(({ contentId }) => contentId).sort()).toEqual(['page', 'root']);
    expect(manifest.entries.find(({ contentId }) => contentId === 'page')?.versions).toEqual({
        draft: 'page-draft-version',
        master: 'page-master-version',
    });
    expect(queryAllLayersToRepoIdBuckets).not.toHaveBeenCalled();
});

test('traverses both branches of dependencies discovered from only one branch', () => {
    addNode('page', '/www.nav.no/page');
    addNode('shared', '/www.nav.no/shared');
    addNode('draft-image', '/www.nav.no/draft-image', { branches: ['draft'] });
    setReferences('page', 'master', ['shared']);
    setReferences('shared', 'draft', ['draft-image']);
    expect(selectPage().entries).toContainEqual(
        expect.objectContaining({
            contentId: 'draft-image',
            branches: ['draft'],
            reason: 'dependency',
        })
    );
});

test('follows references from ancestors and closes cycles once per entry branch', () => {
    addNode('page', '/www.nav.no/page');
    addNode('icon', '/www.nav.no/icon');
    setReferences('root', 'master', ['icon']);
    setReferences('icon', 'master', ['page']);
    expect(selectPage().entries).toContainEqual(expect.objectContaining({ contentId: 'icon' }));
    expect(contentLib.getOutboundDependencies).toHaveBeenCalledTimes(6);
});

test('closes the opposite-branch parent chain of a newly discovered moved ancestor', () => {
    addNode('page', '/www.nav.no/old/page', { branches: ['master'] });
    addNode('parent', '/www.nav.no/old', { branches: ['master'], type: 'base:folder' });
    addNode('parent', '/www.nav.no/new/moved', { branches: ['draft'], type: 'base:folder' });
    addNode('draft-parent', '/www.nav.no/new', { branches: ['draft'], type: 'base:folder' });
    const manifest = createCuratedExportManifest(['/www.nav.no/old/page'], 'page');
    expect(manifest.entries).toContainEqual(
        expect.objectContaining({
            contentId: 'draft-parent',
            branches: ['draft'],
            reason: 'ancestor',
        })
    );
});

test('filters excluded resolved aliases and opposite-branch paths', () => {
    addNode('excluded', '/www.nav.no/testsider/demo');
    jest.mocked(findTargetContentAndLocale).mockReturnValueOnce({
        content: toContent(getNode(repositories.no, 'master', 'excluded')!),
        locale: 'no',
    });
    expect(createCuratedExportManifest(['/www.nav.no/public-alias'], 'page').entries).toEqual([]);

    addNode('page', '/www.nav.no/page', { branches: ['master'] });
    addNode('page', '/www.nav.no/brukertester/page', { branches: ['draft'] });
    const entry = selectPage().entries.find(({ contentId }) => contentId === 'page');
    expect(entry?.branches).toEqual(['master']);
    expect(entry?.paths.draft).toBeUndefined();
    expect(entry?.versions.draft).toBeUndefined();
});

test('rejects a requested structured seed outside the curated selection', () => {
    addNode('excluded', '/www.nav.no/testsider/demo');
    expect(() =>
        createCuratedExportManifest([], 'page', {
            seeds: [
                {
                    repository: repositories.no,
                    branch: 'draft',
                    contentId: 'excluded',
                },
            ],
        })
    ).toThrow(/excluded/);
});

test.each(['en', 'nn'] as const)(
    'preserves draft-only %s editor identity despite a default path collision',
    (locale) => {
        addNode('default-page', '/www.nav.no/page');
        addNode('translated-page', '/www.nav.no/page', { locale, branches: ['draft'] });
        const manifest = createCuratedExportManifest([], 'page', {
            seeds: [
                {
                    repository: repositories[locale],
                    branch: 'draft',
                    contentId: 'translated-page',
                },
            ],
        });
        expect(manifest.entries).toContainEqual(
            expect.objectContaining({
                contentId: 'translated-page',
                repoId: repositories[locale],
                branches: ['draft'],
            })
        );
        expect(manifest.entries.every(({ repoId }) => repoId === repositories[locale])).toBe(true);
        expect(findTargetContentAndLocale).not.toHaveBeenCalled();
    }
);

test('does not use unselected descendants as content-type representatives', () => {
    (Object.keys(repositories) as Array<keyof typeof repositories>).forEach((locale) =>
        addNode(`section-${locale}`, '/www.nav.no/section', {
            locale,
            type: 'no.nav.navno:section-page',
        })
    );
    addNode('child', '/www.nav.no/section/child');
    jest.mocked(queryAllLayersToRepoIdBuckets).mockReturnValue({
        [repositories.no]: [toContent(getNode(repositories.no, 'master', 'child')!)],
    });
    const manifest = createCuratedExportManifest([], 'full', {
        seeds: (Object.keys(repositories) as Array<keyof typeof repositories>).map((locale) => ({
            repository: repositories[locale],
            branch: 'master',
            contentId: `section-${locale}`,
        })),
    });
    expect(manifest.entries).toContainEqual(
        expect.objectContaining({
            contentId: 'child',
            reason: 'type-coverage',
        })
    );
    expect(manifest.missingContentTypes).toEqual([]);
});

test('enumerates recursive editorial descendants as actual entries', () => {
    (Object.keys(repositories) as Array<keyof typeof repositories>).forEach((locale) =>
        addNode(`page-${locale}`, '/www.nav.no/page', { locale })
    );
    addNode('employer', '/www.nav.no/arbeidsgiver', { type: 'base:folder' });
    addNode('editorial', '/www.nav.no/arbeidsgiver/editorial-mappe', { type: 'base:folder' });
    addNode('child', '/www.nav.no/arbeidsgiver/editorial-mappe/child');
    const manifest = createCuratedExportManifest([], 'full', {
        seeds: (Object.keys(repositories) as Array<keyof typeof repositories>).map((locale) => ({
            repository: repositories[locale],
            branch: 'master',
            contentId: `page-${locale}`,
        })),
    });
    expect(manifest.entries).toContainEqual(
        expect.objectContaining({
            contentId: 'child',
            reason: 'office-editorial',
        })
    );
});

test('fails if a selected node changes during graph planning', () => {
    addNode('page', '/www.nav.no/page');
    jest.mocked(contentLib.getOutboundDependencies).mockImplementation(({ key: id }) => {
        if (id === 'page') {
            getNode(repositories.no, 'master', id)!._versionKey = 'changed-version';
        }
        return [];
    });
    expect(selectPage).toThrow(/changed while planning/);
});

test('includes a typed envelope for every sanitized supplement', () => {
    addNode('page', '/www.nav.no/page', { branches: ['master'] });
    const page = getNode(repositories.no, 'master', 'page')!;
    (page.data as Record<string, unknown>).body = 'before\u0002after';
    const manifest = selectPage();
    expect(manifest.sanitizedSupplements[0]).toMatchObject({
        invalidValuePaths: ['data.body'],
        transport: { formatVersion: 1, node: { _versionKey: 'page-master-version' } },
    });
    expect(getCuratedSourceNode).toHaveBeenCalledWith({
        repository: repositories.no,
        branch: 'master',
        contentId: 'page',
        versionId: 'page-master-version',
    });
});

test('keeps stopped optional apps without including system applications', () => {
    addNode('page', '/www.nav.no/page');
    const manifest = selectPage();
    expect(manifest.xpVersion).toBe('7.14.4');
    expect(manifest.applications).toContainEqual(
        expect.objectContaining({
            key: 'com.enonic.app.xpdoctor',
            started: false,
            required: false,
        })
    );
    expect(manifest.applications.every(({ system }) => !system)).toBe(true);
});
