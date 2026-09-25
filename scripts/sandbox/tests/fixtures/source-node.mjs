export const createSourceNode = (overrides = {}) => ({
    node: {
        _id: 'content-id',
        _path: '/content/www.nav.no/page',
        _name: 'page',
        _ts: '2026-09-08T08:00:00Z',
        _versionKey: 'source-version',
        _nodeType: 'content',
        _childOrder: '_name ASC',
        _inheritsPermissions: true,
        _permissions: [{ principal: 'role:system.everyone', allow: ['READ'], deny: [] }],
        _indexConfig: {
            analyzer: 'document_index_default',
            default: { decideByType: true, enabled: true },
            configs: [
                {
                    path: 'data.title',
                    config: { enabled: true, fulltext: true, languages: ['no'] },
                },
            ],
            allText: { languages: ['no'] },
        },
        ...overrides,
    },
    properties: [
        { name: 'type', type: 'string', value: 'no.nav.navno:main-article' },
        {
            name: 'data',
            type: 'property-set',
            value: [
                { name: 'title', type: 'string', value: 'A & B 😀' },
                { name: 'icon', type: 'reference', value: 'image-id' },
                { name: 'year', type: 'long', value: '2026' },
                { name: 'validFrom', type: 'dateTime', value: '2026-09-08T00:00:00.000Z' },
                { name: 'date', type: 'localDate', value: '2026-09-08Z' },
                { name: 'from', type: 'localTime', value: '09:00:00.000Z' },
            ],
        },
    ],
    binaryReferences: [],
    manualOrderValue: null,
});
