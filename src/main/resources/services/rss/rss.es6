const contentLib = require('/lib/xp/content');
const { getContentList } = require('/lib/contentlists/contentlists');

// Urls to contentlist to include in the RSS-feed
const contentLists = [
    '/www.nav.no/no/person/innhold-til-person-forside/nyheter',
    '/www.nav.no/no/bedrift/innhold-til-bedrift-forside/nyheter',
    '/www.nav.no/no/nav-og-samfunn/innhold-til-nav-og-samfunn-forside/nyheter',
];

const handleGet = (req) => {
    if (contentLists) {
        const lists = contentLists.map((key) => {
            return getContentList(key, 3);
        });
        const rssFeed = lists.map((list) => {
            const contentIDs = list.data.sectionContents;
            if (contentIDs) {
                return contentIDs.map((item) => {
                    const content = contentLib.get({ key: item });
                    if (content) {
                        return {
                            title: content.displayName,
                            link: content._path,
                            pubDate: content.publish.first,
                            description: content.data.ingress,
                        };
                    }
                    return null;
                });
            }
            return null;
        });
        return {
            status: 200,
            body: {
                content: rssFeed,
            },
            contentType: 'application/json',
        };
    }
    return {
        status: 500,
        body: {
            message: 'Ingen nyheter funnet',
        },
        contentType: 'application/json',
    };
};

exports.get = handleGet;
