var content = require('/lib/xp/content');
var context = require('/lib/xp/context');
var tools = require('/lib/tools');

exports.handle = function(socket) {
    var elements = createElements();
    socket.emit('newTask', elements);
    socket.on('createRefMap', function() {
        context.run(
            {
                repository: 'cms-repo',
                branch: 'draft',
                user: {
                    login: 'pad',
                    userStore: 'system'
                },
                principals: ['role:system.admin']
            },
            function() {
                tools.createRefMap();
            }
        );
    });

    socket.on('createImageInfo', function() {
        context.run(
            {
                repository: 'cms-repo',
                branch: 'draft',
                user: {
                    login: 'pad',
                    userStore: 'system'
                },
                principals: ['role:system.admin']
            },
            function() {
                createImageInfo(socket);
            }
        );
    });

    socket.on('deleteUnusedExternalLinks', function() {
        context.run(
            {
                repository: 'cms-repo',
                branch: 'draft',
                user: {
                    login: 'pad',
                    userStore: 'system'
                },
                principals: ['role:system.admin']
            },
            function() {
                deleteUnusedExternalLinks(socket);
            }
        );
    });
};

function createElements() {
    return {
        isNew: true,
        head: 'Link Cleanup',
        body: {
            elements: [
                {
                    tag: 'div',
                    tagClass: 'row',
                    elements: [
                        {
                            tag: 'span',
                            text: 'Create ref map'
                        },
                        {
                            tag: 'progress',
                            tagClass: ['progress', 'is-info'],
                            id: 'ref-map',
                            progress: {
                                value: 'ref-map-value',
                                max: 'ref-map-max',
                                valId: 'ref-map-val'
                            }
                        },
                        {
                            tag: 'button',
                            tagClass: ['button', 'is-info'],
                            action: 'createRefMap',
                            text: 'Create'
                        }
                    ]
                },
                {
                    tag: 'div',
                    tagClass: 'row',
                    elements: [
                        {
                            tag: 'span',
                            text: 'Create image info'
                        },
                        {
                            tag: 'progress',
                            tagClass: ['progress', 'is-info'],
                            id: 'image-info',
                            progress: {
                                value: 'image-info-value',
                                max: 'image-info-max',
                                valId: 'image-info-val'
                            }
                        },
                        {
                            tag: 'progress',
                            tagClass: ['progress', 'is-info'],
                            id: 'spreadsheet-info',
                            progress: {
                                value: 'spreadsheet-info-value',
                                max: 'spreadsheet-info-max',
                                valId: 'spreadsheet-info-val'
                            }
                        },
                        {
                            tag: 'progress',
                            tagClass: ['progress', 'is-info'],
                            id: 'document-info',
                            progress: {
                                value: 'document-info-value',
                                max: 'document-info-max',
                                valId: 'document-info-val'
                            }
                        },
                        {
                            tag: 'progress',
                            tagClass: ['progress', 'is-info'],
                            id: 'ekstra_stor_tabell-info',
                            progress: {
                                value: 'ekstra_stor_tabell-info-value',
                                max: 'ekstra_stor_tabell-info-max',
                                valId: 'ekstra_stor_tabell-info-val'
                            }
                        },
                        {
                            tag: 'button',
                            tagClass: ['button', 'is-info'],
                            action: 'createImageInfo',
                            text: 'Create'
                        }
                    ]
                },
                {
                    tag: 'div',
                    tagClass: 'row',
                    elements: [
                        {
                            tag: 'span',
                            text: 'Delete unused Ekstern_lenke'
                        },
                        {
                            tag: 'progress',
                            tagClass: ['progress', 'is-info'],
                            id: 'external-link-find',
                            progress: {
                                value: 'external-link-find-value',
                                max: 'external-link-find-max',
                                valId: 'external-link-find-val'
                            }
                        },
                        {
                            tag: 'progress',
                            tagClass: ['progress', 'is-info'],
                            id: 'external-link-delete',
                            progress: {
                                value: 'external-link-delete-value',
                                max: 'external-link-delete-max',
                                valId: 'external-link-delete-val'
                            }
                        },
                        {
                            tag: 'button',
                            tagClass: ['button', 'is-info'],
                            action: 'deleteUnusedExternalLinks',
                            text: 'Delete'
                        }
                    ]
                }
            ]
        }
    };
}

function createImageInfo(socket) {
    var images = content.query({
        start: 0,
        count: 2000,
        query: 'type = "media:image"'
    }).hits;

    var spreadsheets = content.query({
        start: 0,
        count: 5000,
        query: 'type = "media:spreadsheet"'
    }).hits;

    var documents = content.query({
        start: 0,
        count: 10000,
        query: 'type = "media:document"'
    }).hits;

    var ekstraStorTabells = content.query({
        start: 0,
        count: 10000,
        query: 'type = "no.nav.navno:Ekstra_stor_tabell"'
    }).hits;

    socket.emit('image-info-max', images.length);
    socket.emit('spreadsheet-info-max', spreadsheets.length);
    socket.emit('document-info-max', documents.length);
    socket.emit('ekstra_stor_tabell-info-max', ekstraStorTabells.length);

    var unusedImages = 0;
    images.forEach(function(image, index) {
        if (tools.getRefInfo(image._id).total === 0) {
            unusedImages += 1;
        }
        socket.emit('image-info-value', index + 1);
    });

    var unusedSpreadsheets = 0;
    spreadsheets.forEach(function(spreadsheet, index) {
        if (tools.getRefInfo(spreadsheet._id).total === 0) {
            unusedSpreadsheets += 1;
        }
        socket.emit('spreadsheet-info-value', index + 1);
    });

    var unusedDocuments = 0;
    documents.forEach(function(document, index) {
        if (tools.getRefInfo(document._id).total === 0) {
            unusedDocuments += 1;
        }
        socket.emit('document-info-value', index + 1);
    });

    var unusedEkstraStorTabell = 0;
    ekstraStorTabells.forEach(function(ekstraStorTabell, index) {
        if (tools.getRefInfo(ekstraStorTabell._id).total === 0) {
            unusedEkstraStorTabell += 1;
        }
        socket.emit('ekstra_stor_tabell-info-value', index + 1);
    });

    socket.emit('console.log', 'Unused images :: ' + unusedImages);
    socket.emit('console.log', 'Unused spreadsheets :: ' + unusedSpreadsheets);
    socket.emit('console.log', 'Unused documents :: ' + unusedDocuments);
    socket.emit('console.log', 'Unused ekstra stor tabell :: ' + unusedEkstraStorTabell);
}

function deleteUnusedExternalLinks(socket) {
    var externalLinks = content.query({
        start: 0,
        count: 10000,
        query: 'type = "no.nav.navno:Ekstern_lenke"'
    }).hits;

    socket.emit('external-link-find-max', externalLinks.length);

    var unusedLinks = [];
    externalLinks.forEach(function(value, index) {
        var isRettskilde = false;
        if (value.data && value.data.url) {
            var urlInfo = tools.getIdFromUrl(value.data.url);
            if (urlInfo.external === false && urlInfo.invalid === true && urlInfo.pathTo && urlInfo.pathTo.indexOf('/www.nav.no/rettskildene') !== -1) {
                isRettskilde = true;
            }
            log.info(JSON.stringify(urlInfo, null, 4));
            log.info('isRettskilde : ' + isRettskilde);
        }
        if ((tools.getRefInfo(value._id).total === 0 && value._path.indexOf('/content/') === 0) || isRettskilde) {
            unusedLinks.push(value);
        }
        socket.emit('external-link-find-value', index + 1);
    });

    socket.emit('external-link-delete-max', unusedLinks.length);
    unusedLinks.forEach(function(value, index) {
        // delete Ekstern_lenke
        content.delete({
            key: value._id
        });
        socket.emit('external-link-delete-value', index + 1);
    });
}
