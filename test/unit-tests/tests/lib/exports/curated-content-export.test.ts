import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import { RepoNode } from '/lib/xp/node';
import {
    createCuratedExportManifest,
    getAncestorContentPaths,
} from '@navno-app/lib/exports/curated-content-export';
import { findTargetContentAndLocale } from '@navno-app/services/sitecontent/common/find-target-content-and-locale';
import { getRepoConnection } from '@navno-app/lib/repos/repo-utils';
import { runInLocaleContext } from '@navno-app/lib/localization/locale-context';
import { queryAllLayersToRepoIdBuckets } from '@navno-app/lib/localization/layers-repo-utils/query-all-layers';

jest.mock('/lib/xp/content', () => ({
    get: jest.fn(),
    getOutboundDependencies: jest.fn(),
    query: jest.fn(),
}));
jest.mock('@navno-app/lib/contenttype-lists', () => ({
    dynamicPageContentTypes: ['no.nav.navno:main-article'],
    legacyPageContentTypes: [],
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
    addNode('shared', '/www.nav.no/shared', { type: 'portal:fragment' });
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

test('includes linked pages without recursively selecting the rest of their link graph', () => {
    addNode('page', '/www.nav.no/page');
    addNode('linked-page', '/www.nav.no/linked-page');
    addNode('second-hop-page', '/www.nav.no/second-hop-page');
    setReferences('page', 'master', ['linked-page']);
    setReferences('linked-page', 'master', ['second-hop-page']);

    const contentIds = selectPage().entries.map(({ contentId }) => contentId);
    expect(contentIds).toContain('linked-page');
    expect(contentIds).not.toContain('second-hop-page');
});

test('follows a link content dependency to its target without traversing the target page', () => {
    addNode('page', '/www.nav.no/page');
    addNode('link', '/www.nav.no/link', { type: 'no.nav.navno:internal-link' });
    addNode('target-page', '/www.nav.no/target-page');
    addNode('second-hop-page', '/www.nav.no/second-hop-page');
    setReferences('page', 'master', ['link']);
    setReferences('link', 'master', ['target-page']);
    setReferences('target-page', 'master', ['second-hop-page']);

    const contentIds = selectPage().entries.map(({ contentId }) => contentId);
    expect(contentIds).toContain('link');
    expect(contentIds).toContain('target-page');
    expect(contentIds).not.toContain('second-hop-page');
});

test('closes cycles between transitive dependency content types once per branch', () => {
    addNode('page', '/www.nav.no/page');
    addNode('first-fragment', '/www.nav.no/first-fragment', { type: 'portal:fragment' });
    addNode('second-fragment', '/www.nav.no/second-fragment', { type: 'portal:fragment' });
    setReferences('page', 'master', ['first-fragment']);
    setReferences('first-fragment', 'master', ['second-fragment']);
    setReferences('second-fragment', 'master', ['first-fragment']);

    const contentIds = selectPage().entries.map(({ contentId }) => contentId);
    expect(contentIds).toContain('first-fragment');
    expect(contentIds).toContain('second-fragment');
});

test('includes direct references from ancestors without traversing their referenced pages', () => {
    addNode('page', '/www.nav.no/page');
    addNode('icon', '/www.nav.no/icon');
    addNode('unrelated', '/www.nav.no/unrelated');
    setReferences('root', 'master', ['icon']);
    setReferences('icon', 'master', ['unrelated']);
    const entries = selectPage().entries;
    expect(entries).toContainEqual(expect.objectContaining({ contentId: 'icon' }));
    expect(entries).not.toContainEqual(
        expect.objectContaining({ contentId: 'unrelated' })
    );
});

test('expands dependencies from content later selected as an ancestor', () => {
    addNode('first-page', '/www.nav.no/first-page');
    addNode('second-page', '/www.nav.no/section/second-page');
    addNode('section', '/www.nav.no/section', { type: 'portal:fragment' });
    addNode('section-image', '/www.nav.no/section-image', { type: 'media:image' });
    setReferences('first-page', 'master', ['section']);
    setReferences('section', 'master', ['section-image']);

    const contentIds = createCuratedExportManifest(
        ['/www.nav.no/first-page', '/www.nav.no/section/second-page'],
        'page'
    ).entries.map(({ contentId }) => contentId);
    expect(contentIds).toContain('section-image');
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

describe.each(['draft', 'master'] as const)('source consistency on %s', (branch) => {
    test.each(['version', 'path', 'missing-node', 'missing-version', 'missing-path'])(
        'rejects %s changes after graph selection',
        (change) => {
            addNode('page', '/www.nav.no/page');
            jest.mocked(contentLib.getOutboundDependencies).mockImplementation(({ key: id }) => {
                if (id === 'page') {
                    const node = getNode(repositories.no, branch, id);
                    if (change === 'missing-node') {
                        nodes.delete(key(repositories.no, branch, id));
                    } else if (node) {
                        if (change === 'version' || change === 'missing-version') {
                            node._versionKey = change === 'version' ? 'changed-version' : undefined!;
                        } else {
                            node._path = change === 'path' ? '/content/www.nav.no/moved' : undefined!;
                        }
                    }
                }
                return [];
            });
            expect(selectPage).toThrow(/changed while planning/);
        }
    );
});

test('does not embed legacy sanitized supplements or mutate source text', () => {
    addNode('page', '/www.nav.no/page', { branches: ['master'] });
    const page = getNode(repositories.no, 'master', 'page')!;
    (page.data as Record<string, unknown>).body = 'before\u0002after';
    const manifest = selectPage();
    expect(manifest).not.toHaveProperty('sanitizedSupplements');
    expect(page.data).toEqual({ body: 'before\u0002after' });
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
