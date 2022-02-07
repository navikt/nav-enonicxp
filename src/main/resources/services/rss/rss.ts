import contentLib from '/lib/xp/content';
const { getContentList } = require('/lib/contentlists/contentlists');

// Urls to content lists to include in the RSS-feed
const contentLists = [
    '/www.nav.no/no/person/innhold-til-person-forside/nyheter',
    '/www.nav.no/no/bedrift/innhold-til-bedrift-forside/nyheter',
    '/www.nav.no/no/samarbeidspartner/nyheter',
    '/www.nav.no/no/nav-og-samfunn/kunnskap/fou-midler/nyheter',
];

type newsItem = {
    title: string,
    url: string,
    date?: string,
    description?: string,
} | null;

const handleGet = () => {
    if (contentLists) {
        // Get the IDs to the content lists for the feed
        const listIDs = contentLists.map((key) => {
            return getContentList(key, 3, 'publish.first');
        });
        // Get contentIDs and put all in the same list
        const content4Feed: string[] = [];
        listIDs.forEach((list) => {
            const contentIDs = list.data?.sectionContents;
            contentIDs.forEach((id: string) => {
                content4Feed.push(id);
            });
        });
        // Get selected data from contents into the feed
        const rssFeed: newsItem[] = content4Feed.map((item: string) => {
            const content = contentLib.get({key: item});
            if (content && content.type === "no.nav.navno:main-article") {
                return {
                    title: content.displayName,
                    url: content._path.replace(/^\/www.nav.no/, 'https://www.nav.no'),
                    date: content?.publish?.first,
                    description: content.data?.ingress,
                };
            }
            return null;
        });
        if (rssFeed) {
            return {
                body: rssFeed,
                contentType: 'application/json',
            };
        }
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
