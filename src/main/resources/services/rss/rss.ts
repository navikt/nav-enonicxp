import contentLib from '/lib/xp/content';
import { getContentList } from '../../lib/contentlists/contentlists';
import { forceArray, notEmpty } from '../../lib/nav-utils';

// Urls to content lists to include in the RSS-feed
const contentLists = [
    '/www.nav.no/no/person/innhold-til-person-forside/nyheter',
    '/www.nav.no/no/bedrift/innhold-til-bedrift-forside/nyheter',
    '/www.nav.no/no/samarbeidspartner/nyheter',
    '/www.nav.no/no/nav-og-samfunn/kunnskap/fou-midler/nyheter',
];

type newsItem = {
    title: string;
    url: string;
    date?: string;
    description?: string;
};

const handleGet = () => {
    // Get the IDs to relevant content from given content-lists
    const listIDs = contentLists
        .map((key) => getContentList(key, 3, 'publish.first'))
        .filter(notEmpty);
    // Create the rssFeed based on content IDs
    const rssFeed: newsItem[] = [];
    listIDs.forEach((list) => {
        const contentIDs = forceArray(list.data?.sectionContents);
        contentIDs.forEach((id: string) => {
            const content = contentLib.get({ key: id });
            if (content && content.type === 'no.nav.navno:main-article') {
                rssFeed.push({
                    title: content.displayName,
                    url: content._path.replace(/^\/www.nav.no/, 'https://www.nav.no'),
                    date: content?.publish?.first,
                    description: content?.data?.ingress,
                });
            }
        });
    });
    return {
        body: rssFeed,
        contentType: 'application/json',
    };
};

exports.get = handleGet;
