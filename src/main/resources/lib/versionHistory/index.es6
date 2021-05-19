const libs = {
    portal: require('/lib/xp/portal'),
    content: require('/lib/xp/content'),
    utils: require('/lib/nav-utils'),
    audit: require('/lib/xp/auditlog'),
    node: require('/lib/xp/node'),
};

const getLiveDateTime = (published, timestamp) => {
    // to handle prepublishing we need to make sure that if the publish.from date is in the
    // future in relation to the timestamp we use publish.from
    const publishedFrom = published ? libs.utils.fixDateFormat(published) : false;
    return publishedFrom && new Date(publishedFrom) > new Date(timestamp)
        ? publishedFrom
        : timestamp;
};

const getTimeline = (contentId) => {
    const navRepo = libs.node.connect({
        repoId: 'com.enonic.cms.default',
        branch: 'master',
        user: {
            login: 'su',
        },
        pricipals: ['role:system.admin'],
    });
    const versionFinder = __.newBean('tools.PublishedVersions');
    const versionTimestamps = JSON.parse(versionFinder.getLiveVersions(contentId));

    const allVersions = navRepo.findVersions({ key: contentId, count: 1000 });
    const articles = allVersions.hits
        .filter((version) => 'commitId' in version)
        .map((version) => {
            const article = navRepo.get({ key: contentId, versionId: version.versionId });
            const timestamp = versionTimestamps[version.versionId] ?? '';
            // adding timestamp massage since nashorn Date can't handle ms
            return { version, article, timestamp: libs.utils.fixDateFormat(timestamp) };
        })
        .filter(({ article }) => {
            return article.workflow?.state !== 'IN_PROGRESS' && article.timestamp !== '';
        })
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    // returns the articles sorted newest version to oldest, with the content bound from previous to
    // next element
    const now = new Date().toISOString();
    return articles.reduce((acc, content, ix, src) => {
        const previousContent = src[ix - 1];
        if (previousContent?.article?.publish?.from && src.length > 1) {
            // push if
            // 1. previous version was published
            // 2. not the last version, this is the current live content
            // 3. there is only one version of this content
            // inside for clarity and the need of the live dates
            // 4. check if the published from date is before now, else it hasn't actually been released.
            // 5. check if the previous published date is after or same as current
            const from = getLiveDateTime(
                previousContent?.article?.publish?.from,
                previousContent.timestamp
            );
            const to = getLiveDateTime(content?.article?.publish?.from, content.timestamp);
            if (from < now && to > from && to !== from) {
                acc.push({
                    content: previousContent.article,
                    fromDate: new Date(from),
                    toDate: new Date(to),
                    from,
                    to,
                    description: `${libs.utils.formatDateTime(from)} -- ${libs.utils.formatDateTime(
                        to
                    )}`,
                    versionId: previousContent.version.versionId,
                });
                if (ix + 1 === src.length) {
                    // adds the current element
                    acc.push({
                        content: content.article,
                        fromDate: new Date(to),
                        from: to,
                        description: `${libs.utils.formatDateTime(to)} -- `,
                        versionId: content.version.versionId,
                    });
                }
            }
        }
        return acc;
    }, []);
};

module.exports = {
    getTimeline,
};
