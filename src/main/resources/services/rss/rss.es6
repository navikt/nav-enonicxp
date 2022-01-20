// const contentLib = require('/lib/xp/content');
// const { getContentList } = require('/lib/contentlists/contentlists');
const Feed = require('/assets/github-com-rigelk-feed/1.1.11/src/github-com-rigelk-feed');

// Urls to content lists to include in the RSS-feed
const contentLists = [
    '/www.nav.no/no/person/innhold-til-person-forside/nyheter',
    '/www.nav.no/no/bedrift/innhold-til-bedrift-forside/nyheter',
    '/www.nav.no/no/nav-og-samfunn/innhold-til-nav-og-samfunn-forside/nyheter',
];

const feed = new Feed({
    title: 'Feed Title',
    description: 'This is my personal feed!',
    id: 'http://example.com/',
    link: 'http://example.com/',
    image: 'http://example.com/image.png',
    favicon: 'http://example.com/favicon.ico',
    copyright: 'All rights reserved 2013, John Doe',
    generator: 'awesome', // optional, default = 'Feed for Node.js'
    feedLinks: {
        json: 'https://example.com/json',
        atom: 'https://example.com/atom',
    },
    author: {
        name: 'John Doe',
        email: 'johndoe@example.com',
        link: 'https://example.com/johndoe',
    },
});

const handleGet = (req) => {
    if (contentLists) {
        /*
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
                                item: {
                                    title: content.displayName,
                                    link: content._path,
                                    pubDate: content.publish.first,
                                    description: content.data.ingress,
                                }
                            };
                        }
                        return null;
                    });
                }
            }
            return null;
        });
         */
        return {
            status: 200,
            body: {
                feed,
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
