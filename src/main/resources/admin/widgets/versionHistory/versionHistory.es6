const nodeLib = require('/lib/xp/node');
const thymeleaf = require('/lib/thymeleaf');

const libs = {
    portal: require('/lib/xp/portal'),
    content: require('/lib/xp/content'),
    utils: require('/lib/nav-utils'),
    audit: require('/lib/xp/auditlog'),
};
const view = resolve('versionHistorySimpleView.html');
const renderPage = (req, content) => {
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

    // Sosiale medier
    let socials = false;
    if (data.social) {
        socials = Array.isArray(data.social) ? data.social : [data.social];
    }
    socials = socials
        ? socials.map((el) => {
              let tmpText = 'Del på ';
              if (el === 'linkedin') {
                  tmpText += 'LinkedIn';
              } else if (el === 'facebook') {
                  tmpText += 'Facebook';
              } else {
                  tmpText += 'Twitter';
              }
              return {
                  type: el,
                  text: tmpText,
                  href: libs.utils.getSocialRef(el, content, req),
              };
          })
        : false;

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
    if (!!data.picture && data.picture.target) {
        const { caption, altText, target, size } = data.picture;
        const imgClass =
            // eslint-disable-next-line no-nested-ternary
            size === '40' ? 'figure-small' : size === '70' ? 'figure-medium' : 'figure-full';
        imageObj = {
            url: libs.utils.getImageUrl(target, 'max(768)'),
            imgClass,
            caption,
            altText,
        };
    }
    // Definer model og kall rendring (view)
    return {
        displayName: content.displayName,
        publishedFrom: content.publish.from,
        ingress: data.ingress,
        hasTableOfContents: toc.length > 0,
        toc,
        htmlText,
        hasFact,
        htmlFact,
        imageObj,
        socials,
    };
};
// const renderContent = (req, content) => {};
exports.get = (req) => {
    const contentId = req.params.contentId;
    // const currentComponent = libs.portal.getComponent();

    // const partUrl = libs.portal.componentUrl({
    //     component: currentComponent.path,
    // });

    // log.info(partUrl);
    if (!contentId) {
        return {
            contentType: 'text/html',
            body: '<widget class="error">No content selected</widget>',
        };
    }

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
        });

    const timeline = articles.reverse().reduce((acc, content, ix) => {
        const previousContent = articles[ix - 1];
        if (
            previousContent?.article?.publish?.from ||
            (ix === articles.length - 1 && !content.article?.publish?.from)
        ) {
            acc.push(
                `${libs.utils.formatDateTime(
                    previousContent.timestamp
                )} -- ${libs.utils.formatDateTime(content.timestamp)} ${
                    content.article.displayName
                }`
            );
        }
        return acc;
    }, []);
    log.info(JSON.stringify(timeline, null, 4));

    const model = renderPage(req, articles[articles.length - 1].article);
    return {
        contentType: 'text/html',
        body: thymeleaf.render(view, model),
    };
};
