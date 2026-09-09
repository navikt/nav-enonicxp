import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import {
    createSanitizedSupplement,
    createCuratedExportManifest,
    getAncestorContentPaths,
} from '@navno-app/lib/exports/curated-content-export';
import { findTargetContentAndLocale } from '@navno-app/services/sitecontent/common/find-target-content-and-locale';
import { runInLocaleContext } from '@navno-app/lib/localization/locale-context';
import { getRepoConnection } from '@navno-app/lib/repos/repo-utils';

jest.mock('/lib/xp/content', () => ({
    get: jest.fn(),
    getOutboundDependencies: jest.fn(),
    query: jest.fn(() => ({ hits: [], total: 0 })),
}));

jest.mock('@navno-app/lib/contenttype-lists', () => ({
    dynamicPageContentTypes: [],
}));

jest.mock('@navno-app/services/sitecontent/common/find-target-content-and-locale', () => ({
    findTargetContentAndLocale: jest.fn(),
}));

jest.mock('@navno-app/lib/localization/layers-data', () => ({
    getLayersData: jest.fn(() => ({
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
    })),
}));

jest.mock('@navno-app/lib/localization/locale-context', () => ({
    runInLocaleContext: jest.fn((_context, callback) => callback()),
}));

jest.mock('@navno-app/lib/repos/repo-utils', () => ({
    getRepoConnection: jest.fn(() => ({
        get: jest.fn(() => null),
        query: jest.fn(() => ({ total: 0 })),
    })),
}));

jest.mock('/lib/xp/project', () => ({
    list: jest.fn(() => [
        { id: 'default', language: 'no', parents: [], siteConfig: [] },
        {
            id: 'navno-engelsk',
            language: 'en',
            parents: ['default'],
            siteConfig: [{ applicationKey: 'no.nav.navno' }],
        },
        {
            id: 'navno-nynorsk',
            language: 'nn',
            parents: ['default'],
            siteConfig: [{ applicationKey: 'no.nav.navno' }],
        },
    ]),
}));

jest.mock('/lib/xp/app', () => ({
    list: jest.fn(() => [
        { key: 'no.nav.navno', version: '1.0.0', systemVersion: '[7.16.0,8.0.0)', started: true, system: false },
        { key: 'com.enonic.app.contentstudio', version: '5.3.2', systemVersion: '[7.7.0,8.0.0)', started: true, system: false },
        { key: 'com.enonic.app.xpdoctor', version: '2.3.0', systemVersion: '[7.3.0,8.0.0)', started: true, system: false },
        { key: 'com.enonic.xp.app.standardidprovider', version: '7.16.6', systemVersion: '7.16.6', started: true, system: true },
    ]),
}));

jest.mock('@navno-app/lib/localization/layers-repo-utils/query-all-layers', () => ({
    queryAllLayersToRepoIdBuckets: jest.fn(() => ({})),
}));

const createContent = (id: string, path: string): Content =>
    ({
        _id: id,
        _path: path,
        name: path.slice(path.lastIndexOf('/') + 1),
        displayName: id,
        type: 'no.nav.navno:content-page-with-sidemenus',
    }) as unknown as Content;

describe('Curated content export', () => {
    test('sanitizes XML-invalid characters into a branch supplement', () => {
        const node = {
            _id: 'invalid-content',
            _path: '/content/www.nav.no/invalid-content',
            attachments: {},
            data: {
                heading: 'Valid heading',
                body: `Before${String.fromCharCode(2)}after`,
            },
        } as never;

        expect(
            createSanitizedSupplement(node, 'com.enonic.cms.default', 'draft')
        ).toEqual(
            expect.objectContaining({
                contentId: 'invalid-content',
                contentPath: '/content/www.nav.no/invalid-content',
                repoId: 'com.enonic.cms.default',
                branch: 'draft',
                invalidValuePaths: ['data.body'],
                node: expect.objectContaining({
                    data: { heading: 'Valid heading', body: 'Beforeafter' },
                }),
            })
        );
    });

    test('returns every ancestor through the content root', () => {
        expect(
            getAncestorContentPaths('/content/www.nav.no/person/topic/page')
        ).toEqual([
            '/content/www.nav.no',
            '/content/www.nav.no/person',
            '/content/www.nav.no/person/topic',
        ]);
    });

    test('limits page scope to the selected content graph', () => {
        const seed = createContent('seed', '/www.nav.no/seed/page');
        const contents = new Map<string, Content>([
            ['/www.nav.no', createContent('root', '/www.nav.no')],
            ['/www.nav.no/seed', createContent('seed-parent', '/www.nav.no/seed')],
        ]);
        jest.mocked(findTargetContentAndLocale).mockReturnValue({ content: seed, locale: 'no' });
        jest.mocked(contentLib.get).mockImplementation(({ key }) => contents.get(key) ?? null);
        jest.mocked(contentLib.getOutboundDependencies).mockReturnValue([]);

        const manifest = createCuratedExportManifest(['/www.nav.no/seed/page'], 'page');

        expect(manifest.scope).toBe('page');
        expect(manifest.entries.map(({ contentId, reason }) => ({ contentId, reason }))).toEqual([
            { contentId: 'seed', reason: 'popular' },
            { contentId: 'root', reason: 'ancestor' },
            { contentId: 'seed-parent', reason: 'ancestor' },
        ]);
        expect(manifest.entries.every(({ repoId }) => repoId === 'com.enonic.cms.default')).toBe(true);
        expect(findTargetContentAndLocale).toHaveBeenCalledTimes(1);
    });

    test('adds recursive office editorial descendants as transferable entries', () => {
        const editorialChild = createContent(
            'editorial-child',
            '/www.nav.no/arbeidsgiver/editorial-mappe/editorial-child'
        );
        jest.mocked(findTargetContentAndLocale).mockImplementation(({ path }) => {
            const locale = path.endsWith('/en') ? 'en' : path.endsWith('/nn') ? 'nn' : 'no';
            return { content: createContent(path, path), locale };
        });
        jest.mocked(contentLib.get).mockImplementation(({ key }) =>
            createContent(String(key), String(key))
        );
        jest.mocked(contentLib.getOutboundDependencies).mockReturnValue([]);
        jest.mocked(contentLib.query).mockImplementation(({ query }) => {
            const isEditorialQuery = String(query).includes(
                '/arbeidsgiver/editorial-mappe/*'
            );
            return {
                hits: isEditorialQuery ? [editorialChild] : [],
                total: isEditorialQuery ? 1 : 0,
            } as never;
        });

        const manifest = createCuratedExportManifest([
            '/www.nav.no/seed',
            '/www.nav.no/seed/en',
            '/www.nav.no/seed/nn',
        ]);

        expect(manifest.entries).toContainEqual(
            expect.objectContaining({
                contentId: 'editorial-child',
                repoId: 'com.enonic.cms.default',
                reason: 'office-editorial',
                branches: ['master'],
            })
        );
    });

    test('adds transitive dependencies and their ancestors', () => {
        const contents = new Map<string, Content>([
            ['/www.nav.no', createContent('root', '/www.nav.no')],
            ['/www.nav.no/seed', createContent('seed-parent', '/www.nav.no/seed')],
            ['/www.nav.no/seed/page', createContent('seed', '/www.nav.no/seed/page')],
            ['/www.nav.no/shared', createContent('shared', '/www.nav.no/shared')],
            ['/www.nav.no/shared/deep', createContent('deep', '/www.nav.no/shared/deep')],
            ['/www.nav.no/arbeidsgiver', createContent('employer', '/www.nav.no/arbeidsgiver')],
            ['/www.nav.no/kontor', createContent('office', '/www.nav.no/kontor')],
            ['dependency-one', createContent('dependency-one', '/www.nav.no/shared/one')],
            ['dependency-two', createContent('dependency-two', '/www.nav.no/shared/deep/two')],
        ]);
        const seed = createContent('seed', '/www.nav.no/seed/page');

        jest.mocked(findTargetContentAndLocale).mockImplementation(({ path }) => {
            const locale = path.endsWith('/en') ? 'en' : path.endsWith('/nn') ? 'nn' : 'no';
            return {
                content: path === '/www.nav.no/seed/page' ? seed : createContent(path, path),
                locale,
            };
        });
        jest.mocked(contentLib.get).mockImplementation(({ key }) => contents.get(key) ?? null);
        jest.mocked(contentLib.getOutboundDependencies).mockImplementation(({ key }) => {
            if (key === 'seed') {
                return ['dependency-one'];
            }
            if (key === 'dependency-one') {
                return ['dependency-two'];
            }
            return [];
        });

        const manifest = createCuratedExportManifest([
            '/www.nav.no/seed/page',
            '/www.nav.no/seed/page/en',
            '/www.nav.no/seed/page/nn',
        ]);

        expect(manifest.entries).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ contentId: 'dependency-one', reason: 'dependency' }),
                expect.objectContaining({ contentId: 'dependency-two', reason: 'dependency' }),
                expect.objectContaining({ contentId: 'seed-parent', reason: 'ancestor' }),
                expect.objectContaining({ contentId: 'deep', reason: 'ancestor' }),
            ])
        );
        expect(contentLib.getOutboundDependencies).toHaveBeenCalledWith({
            key: 'dependency-one',
        });
        expect(manifest.projects.map(({ id }) => id)).toEqual([
            'default',
            'navno-engelsk',
            'navno-nynorsk',
        ]);
        expect(manifest.xpVersion).toBe('7.16.6');
        expect(manifest.applications.map(({ key }) => key)).toEqual([
            'no.nav.navno',
            'com.enonic.app.contentstudio',
            'com.enonic.app.xpdoctor',
        ]);
    });

    test('adds draft-only dependencies with draft ancestors', () => {
        let activeBranch: 'draft' | 'master' = 'master';
        const seed = createContent('seed', '/www.nav.no/seed/page');
        const draftDependency = createContent('draft-dependency', '/www.nav.no/drafts/dependency');
        const contents = new Map<string, Content>([
            ['/www.nav.no', createContent('root', '/www.nav.no')],
            ['/www.nav.no/seed', createContent('seed-parent', '/www.nav.no/seed')],
            ['/www.nav.no/seed/page', seed],
            ['/www.nav.no/drafts', createContent('drafts', '/www.nav.no/drafts')],
            ['/www.nav.no/arbeidsgiver', createContent('employer', '/www.nav.no/arbeidsgiver')],
            ['/www.nav.no/kontor', createContent('office', '/www.nav.no/kontor')],
            ['draft-dependency', draftDependency],
        ]);

        jest.mocked(runInLocaleContext).mockImplementation((context, callback) => {
            activeBranch = context.branch ?? 'master';
            return callback();
        });
        jest.mocked(getRepoConnection).mockImplementation(({ branch }) => ({
            get: jest.fn((key: string) => {
                if (branch === 'draft' && key === 'seed') {
                    return { _id: seed._id, _path: `/content${seed._path}` };
                }
                return null;
            }),
            query: jest.fn(() => ({ total: 0 })),
        }) as unknown as ReturnType<typeof getRepoConnection>);
        jest.mocked(findTargetContentAndLocale).mockImplementation(({ path }) => ({
            content: path === '/www.nav.no/seed/page' ? seed : createContent(path, path),
            locale: path.endsWith('/en') ? 'en' : path.endsWith('/nn') ? 'nn' : 'no',
        }));
        jest.mocked(contentLib.get).mockImplementation(({ key }) => contents.get(key) ?? null);
        jest.mocked(contentLib.getOutboundDependencies).mockImplementation(({ key }) =>
            activeBranch === 'draft' && key === 'seed' ? ['draft-dependency'] : []
        );

        const manifest = createCuratedExportManifest([
            '/www.nav.no/seed/page',
            '/www.nav.no/seed/page/en',
            '/www.nav.no/seed/page/nn',
        ]);

        expect(manifest.entries).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    contentId: 'draft-dependency',
                    reason: 'dependency',
                    paths: { draft: '/content/www.nav.no/drafts/dependency' },
                    branches: ['draft'],
                }),
                expect.objectContaining({ contentId: 'drafts', reason: 'ancestor' }),
            ])
        );
    });

    test('keeps branch-specific paths when content was moved in draft', () => {
        const seed = createContent('moved-seed', '/www.nav.no/master-parent/page');

        jest.mocked(getRepoConnection).mockImplementation(({ branch }) => ({
            get: jest.fn((key: string) =>
                key === seed._id
                    ? {
                          _id: seed._id,
                          _path:
                              branch === 'draft'
                                  ? '/content/www.nav.no/draft-parent/page'
                                  : '/content/www.nav.no/master-parent/page',
                      }
                    : null
            ),
            query: jest.fn(() => ({ total: 0 })),
        }) as unknown as ReturnType<typeof getRepoConnection>);
        jest.mocked(findTargetContentAndLocale).mockImplementation(({ path }) => ({
            content: path.includes('/seed') ? seed : createContent(path, path),
            locale: path.endsWith('/en') ? 'en' : path.endsWith('/nn') ? 'nn' : 'no',
        }));
        jest.mocked(contentLib.get).mockImplementation(({ key }) =>
            typeof key === 'string' && key.startsWith('/') ? createContent(key, key) : null
        );
        jest.mocked(contentLib.getOutboundDependencies).mockReturnValue([]);

        const manifest = createCuratedExportManifest([
            '/www.nav.no/seed',
            '/www.nav.no/seed/en',
            '/www.nav.no/seed/nn',
        ]);

        expect(manifest.entries).toContainEqual(
            expect.objectContaining({
                contentId: seed._id,
                repoId: 'com.enonic.cms.default',
                paths: {
                    draft: '/content/www.nav.no/draft-parent/page',
                    master: '/content/www.nav.no/master-parent/page',
                },
                branches: ['draft', 'master'],
            })
        );
    });

    test('does not traverse a selected dependency in a branch where it is absent', () => {
        const draftOnlyDependency = createContent(
            'draft-only',
            '/www.nav.no/drafts/draft-only'
        );
        const masterSeed = createContent('master-seed', '/www.nav.no/master-seed');
        const draftSeed = createContent('draft-seed', '/www.nav.no/draft-seed');
        const contents = new Map<string, Content>([
            ['/www.nav.no', createContent('root', '/www.nav.no')],
            ['/www.nav.no/arbeidsgiver', createContent('employer', '/www.nav.no/arbeidsgiver')],
            ['/www.nav.no/kontor', createContent('office', '/www.nav.no/kontor')],
            ['/www.nav.no/drafts', createContent('drafts', '/www.nav.no/drafts')],
            ['/www.nav.no/seed', createContent('seed', '/www.nav.no/seed')],
            ['draft-only', draftOnlyDependency],
        ]);
        let activeBranch: 'draft' | 'master' = 'master';
        const dependencyTraversalBranches: Array<'draft' | 'master'> = [];

        jest.mocked(runInLocaleContext).mockImplementation((context, callback) => {
            activeBranch = context.branch ?? 'master';
            return callback();
        });
        jest.mocked(getRepoConnection).mockImplementation(({ branch }) => ({
            get: jest.fn((key: string) => {
                if (branch !== 'draft') {
                    return null;
                }
                if (key === draftOnlyDependency._id) {
                    return { _id: key, _path: `/content${draftOnlyDependency._path}` };
                }
                if (key === draftSeed._id) {
                    return { _id: key, _path: `/content${draftSeed._path}` };
                }
                return null;
            }),
            query: jest.fn(() => ({ total: 0 })),
        }) as unknown as ReturnType<typeof getRepoConnection>);
        jest.mocked(findTargetContentAndLocale).mockImplementation(({ path }) => ({
            content: path.includes('draft-seed')
                ? draftSeed
                : path.includes('master-seed')
                  ? masterSeed
                  : createContent(path, path),
            locale: path.endsWith('/en') ? 'en' : path.endsWith('/nn') ? 'nn' : 'no',
        }));
        jest.mocked(contentLib.get).mockImplementation(({ key }) => contents.get(key) ?? null);
        jest.mocked(contentLib.getOutboundDependencies).mockImplementation(({ key }) => {
            if (key === draftOnlyDependency._id) {
                dependencyTraversalBranches.push(activeBranch);
            }
            if (key === draftSeed._id || key === masterSeed._id) {
                return ['draft-only'];
            }
            return [];
        });

        createCuratedExportManifest([
            '/www.nav.no/draft-seed',
            '/www.nav.no/master-seed',
            '/www.nav.no/seed/en',
            '/www.nav.no/seed/nn',
        ]);

        expect(dependencyTraversalBranches).toEqual(['draft']);
    });
});