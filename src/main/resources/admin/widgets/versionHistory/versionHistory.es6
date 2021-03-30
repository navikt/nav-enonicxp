const nodeLib = require('/lib/xp/node');
const thymeleaf = require('/lib/thymeleaf');

const libs = {
    portal: require('/lib/xp/portal'),
    content: require('/lib/xp/content'),
    utils: require('/lib/nav-utils'),
    audit: require('/lib/xp/auditlog'),
};

/**
 * Get the extension from the mime/type
 * Supported types, [Jpeg Png Gif Svg]
 * @param {Object} contentId The id to the image content
 */
function getExtensionForImage(contentId) {
    const mimeTypes = {
        'image/png': 'png',
        'image/jpeg': 'jpg',
        'image/gif': 'gif',
        'image/svg+xml': 'svg',
    };
    const content = libs.content.get({ key: contentId });
    if (content) {
        const imageInfo = content.x && content.x.media ? content.x.media.imageInfo : false;

        if (imageInfo) {
            return mimeTypes[imageInfo.contentType] || '';
        }
    }
    return '';
}

/**
 * Get the imageUrl for a contentId, wrapper to portal.imageUrl to handle extensions correctly
 * @param {String} contentId The id of the content.
 * scale is default blank
 */
function getImageUrl(contentId, scale = '') {
    const extension = getExtensionForImage(contentId);
    return libs.portal.imageUrl({
        id: contentId,
        format: extension,
        scale,
    });
}
const view = resolve('versionHistorySimpleView.html');
const renderPage = (version) => {
    if (!version) {
        log.info('version is off');
    }
    let content = version.content;
    if (content.type === app.name + ':main-article-chapter') {
        content = libs.content.get({
            key: content.data.article,
        });
    }
    const data = content.data;
    const hasFact = !!data.fact;
    let htmlText = data.text;

    // Innholdsfortegnelse
    const toc = [];
    if (data.hasTableOfContents && data.hasTableOfContents !== 'none') {
        let count = 0;
        let ch = 1;
        let ind = htmlText.indexOf('<h3>');

        while (ind !== -1 && count < 100) {
            const h2End = ind + 4;
            const ssEnd = htmlText.indexOf('</h3>', ind);
            const ss = htmlText
                .slice(h2End, ssEnd)
                .replace(/<([^>]+)>/gi, '') // Strip html
                .replace(/&nbsp;/gi, ' '); // Replace &nbsp;
            count++;
            toc.push(ss);
            htmlText = htmlText.replace(
                '<h3>',
                '<h3 id="chapter-' + ch++ + '" tabindex="-1" class="chapter-header">'
            );
            ind = htmlText.indexOf('<h3>');
        }
    }

    // Prosessering av HTML-felter (håndtere url-er inne i html-en) og image-urls
    htmlText = libs.portal.processHtml({
        value: htmlText,
    });
    // Fjern tomme headings og br-tagger fra HTML
    htmlText = htmlText.replace(/<h\d>\s*<\/h\d>/g, '');
    htmlText = htmlText.replace(/<h\d>&nbsp;<\/h\d>/g, '');
    htmlText = htmlText.replace(/<br \/>/g, '');
    const htmlFact = hasFact
        ? libs.portal.processHtml({
              value: data.fact,
          })
        : null;

    let imageObj = null;
    if (data.picture?.target) {
        const { caption, altText, target, size } = data.picture;
        const imgClass =
            // eslint-disable-next-line no-nested-ternary
            size === '40' ? 'figure-small' : size === '70' ? 'figure-medium' : 'figure-full';
        imageObj = {
            url: getImageUrl(target, 'max(768)'),
            imgClass,
            caption,
            altText,
        };
    }
    log.info(JSON.stringify(imageObj, null, 4));

    // current model
    return {
        description: version.description,
        versionId: version.versionId,
        displayName: content.displayName,
        from: libs.utils.formatDateTime(version.from),
        hasFact,
        hasTableOfContents: toc.length > 0,
        htmlFact,
        htmlText,
        imageObj,
        ingress: data.ingress,
        publishedFrom: content.publish.from,
        to: libs.utils.formatDateTime(version.to),
        toc,
    };
};

const getTimeline = (contentId) => {
    const navRepo = nodeLib.connect({
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
            const auditLog = libs.audit.find({ ids: [contentId], count: 100 });
            const timestamp = versionTimestamps[version.versionId] ?? '';
            return { auditLog, version, article, timestamp };
        })
        .filter(({ article }) => {
            return article.workflow?.state !== 'IN_PROGRESS';
        })
        .sort((a, b) => {
            const aDate = a.article.modifiedTime;
            const bDate = b.article.modifiedTime;

            if (aDate < bDate) {
                return 1;
            }
            if (bDate > aDate) {
                return -1;
            }
            return 0;
        })
        .reverse();

    return articles.reduce((acc, content, ix) => {
        const previousContent = articles[ix - 1];
        if (
            previousContent?.article?.publish?.from ||
            (ix === articles.length - 1 && !content.article?.publish?.from)
        ) {
            acc.push({
                content: content.article,
                from: previousContent.timestamp,
                to: content.timestamp,
                description: `${libs.utils.formatDateTime(
                    previousContent.timestamp
                )} -- ${libs.utils.formatDateTime(content.timestamp)}`,
                versionId: content.version.versionId,
            });
        }
        return acc;
    }, []);
};

exports.get = (req) => {
    const contentId = req.params.contentId;
    if (!contentId) {
        return {
            contentType: 'text/html',
            body: '<widget class="error">No content selected</widget>',
        };
    }
    const timeline = getTimeline(contentId);
    const models = timeline.map((version) => renderPage(version)).reverse();
    const widgetScriptUrl = libs.portal.assetUrl({ path: 'js/versionHistory.js' });
    return {
        contentType: 'text/html',
        body: thymeleaf.render(view, { widgetScriptUrl, versions: models }),
    };
};
