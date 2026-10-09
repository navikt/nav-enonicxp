const modules = {
    'lib/cache/invalidate-event-handlers': ['activateCacheEventListeners'],
    'lib/sitemap/sitemap': [
        'activateSitemapDataUpdateEventListener',
        'generateSitemapDataAndActivateSchedule',
    ],
    'lib/cluster-utils/cluster-api': ['updateClusterInfo'],
    'lib/contentlists/remove-unpublished': ['activateContentListItemUnpublishedListener'],
    'lib/paths/custom-paths/custom-path-event-listeners': ['activateCustomPathNodeListeners'],
    'lib/office-pages/office-tasks': ['createOfficeImportSchedule'],
    'lib/time-travel/time-travel-hooks': ['hookLibsWithTimeTravel'],
    'lib/repos/misc-repo': ['initMiscRepo'],
    'lib/localization/layers-data': ['initLayersData'],
    'lib/localization/publish-events': ['activateLayersEventListeners'],
    'lib/contentUpdate/content-update-listener': ['activateContentUpdateListener'],
    'lib/search/event-handlers': ['activateExternalSearchIndexEventHandlers'],
    'lib/cluster-utils/main-datanode': ['initializeMainDatanodeSelection'],
    'lib/scheduling/schedule-cleanup': ['activateSchedulerCleanupSchedule'],
    'lib/external-archive/content-tree-archive': ['initArchiveContentTrees'],
    'lib/archiving/archive-old-news': ['activateArchiveNewsSchedule'],
};

describe('local curated import startup', () => {
    const originalConfig = app.config;
    const originalBridge = Object.getOwnPropertyDescriptor(globalThis, '__');

    beforeEach(() => {
        Object.defineProperty(globalThis, '__', {
            value: { disposer: jest.fn() },
            configurable: true,
        });
    });

    afterEach(() => {
        app.config = originalConfig;
        if (originalBridge) {
            Object.defineProperty(globalThis, '__', originalBridge);
        } else {
            Reflect.deleteProperty(globalThis, '__');
        }
        jest.resetModules();
    });

    test.each([
        ['localhost', 'true', false],
        ['localhost', undefined, true],
        ['localhost', 'false', true],
        ['p', 'true', true],
    ] as const)('env=%s, import mode=%s, listeners=%s', (env, mode, active) => {
        const calls: string[] = [];
        app.config = { ...originalConfig, env, curatedImportInProgress: mode };
        jest.isolateModules(() => {
            jest.doMock('@navno-app/lib/polyfills', () => ({}));
            jest.doMock('/lib/xp/cluster', () => ({ isMaster: () => true }));
            Object.entries(modules).forEach(([path, names]) => {
                jest.doMock(`@navno-app/${path}`, () =>
                    Object.fromEntries(names.map((name) => [name, () => calls.push(name)]))
                );
            });
            require('@navno-app/main');
        });
        expect(calls).toContain('initLayersData');
        expect(calls).toContain('initMiscRepo');
        for (const name of [
            'activateCustomPathNodeListeners',
            'activateContentUpdateListener',
            'activateLayersEventListeners',
            'activateCacheEventListeners',
            'createOfficeImportSchedule',
            'activateArchiveNewsSchedule',
        ]) {
            expect(calls.includes(name)).toBe(active);
        }
    });
});
