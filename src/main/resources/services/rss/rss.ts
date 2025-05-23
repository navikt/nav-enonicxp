import * as contentLib from '/lib/xp/content';
import { getContentList } from '../../lib/contentlists/contentlists';
import { notNullOrUndefined } from '../../lib/utils/mixed-bag-of-utils';
import { stripPathPrefix } from '../../lib/paths/path-utils';
import { forceArray } from '../../lib/utils/array-utils';
import { replaceNAVwithNav } from '../../lib/utils/string-utils';

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

export const get = () => {
    // Get the IDs to relevant content from given content-lists
    const listIDs = contentLists
        .map((key) => getContentList(key, 3, 'publish.from'))
        .filter(notNullOrUndefined);
    // Create the rssFeed based on content IDs
    const rssFeed: newsItem[] = [];
    listIDs.forEach((list) => {
        const contentIDs = forceArray(list.data?.sectionContents);
        contentIDs.forEach((id: string) => {
            const content = contentLib.get({ key: id });
            if (content && content.type === 'no.nav.navno:main-article') {
                rssFeed.push({
                    title: content.displayName,
                    url: `https://www.nav.no${stripPathPrefix(content._path)}`,
                    date: content?.publish?.from,
                    description: content?.data?.ingress,
                });
            }
        });
    });

    const replacedNAVwithNav = replaceNAVwithNav(rssFeed);
    return {
        body: replacedNAVwithNav,
        contentType: 'application/json',
    };
};
