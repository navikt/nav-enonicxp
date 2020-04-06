const libs = {
    thymeleaf: require('/lib/thymeleaf'),
    portal: require('/lib/xp/portal'),
    content: require('/lib/xp/content'),
    context: require('/lib/xp/context'),
    lang: require('/lib/i18nUtil'),
    cache: require('/lib/siteCache'),
};
const view = resolve('driftsmelding-heading.html');
const htmlClasses = {
    warning: 'warning',
    prodstatus: 'status',
    info: 'info',
};
const icon = {
    warning: null,
    prodstatus: 'alertstripe__ikon_advarsel.svg',
    info: 'alertstripe__ikon_info.svg',
};
const getLinkText = (message, target, language) => {
    const defaultText = libs.lang.parseBundle(language).message.linktext;

    if (message.data.type === 'info' || message.data.type === 'warning') {
        return target ? message.data.title || target.displayName : defaultText;
    }
    return defaultText;
};

const getHeading = (message, target) => {
    if (target) {
        return message.data.title || target.displayName;
    }
    return message.data.title || message.displayName;
};

const getText = (message, target) => {
    if (message.data.type === 'info' || message.data.type === 'warning') {
        return target ? libs.portal.processHtml({ value: message.data.text }) || target.text : '';
    }
    return '';
};

const constructMessage = (message, language) => {
    if (message) {
        const targetArticle = message.data.target
            ? libs.content.get({
                  key: message.data.target,
              })
            : null;
        const url = libs.portal.pageUrl({
            path: targetArticle ? targetArticle._path : message._path,
        });

        const linktext = getLinkText(message, targetArticle, language);
        const heading = getHeading(message, targetArticle);
        const iconUrl =
            icon[message.data.type] &&
            libs.portal.assetUrl({
                path: 'img/navno/' + icon[message.data.type],
                type: 'absolute',
            });
        const text = getText(message, targetArticle);
        return {
            heading,
            iconUrl,
            url,
            linktext,
            text,
            publishedDate: message.publish.from,
            type: htmlClasses[message.data.type] || '',
        };
    }
    return false;
};

const showMessages = () => {
    let body = null;
    const content = libs.portal.getContent();
    const language = content.language || 'no';

    const result = libs.content.getChildren({
        key: '/www.nav.no/no/driftsmeldinger',
        start: 0,
        count: 10,
        sort: '_manualordervalue DESC',
    });
    const messages = result.hits
        .filter(item => item.type === 'no.nav.navno:melding' && item.data.exposureLevel === 'site')
        .reduce(
            (agg, item) => {
                const latestPublishedDate =
                    agg.latestPublishedDate && agg.latestPublishedDate > item.publish.from
                        ? agg.latestPublishedDate
                        : item.publish.from;

                // massage hit to a message object
                agg.items.push(constructMessage(item, language));

                return { ...agg, latestPublishedDate };
            },
            {
                items: [],
                latestPublishedDate: '',
            }
        );
    if (messages.items.length > 0) {
        body = libs.thymeleaf.render(view, messages);
    }

    return {
        contentType: 'text/html',
        body,
    };
};

const handleGet = () => {
    // Må kjøre i context av master-branch, ellers vil preview i Content studio
    // alltid vise en driftsmelding
    // Midlertidig fix: Cacher aldri TODO: Sette tilbake når cache fungerer return
    // libs.cache.getPaths('driftsmelding-heading', undefined, req.branch, () =>
    // {
    return libs.context.run(
        {
            repository: 'com.enonic.cms.default',
            branch: 'master',
            user: {
                login: 'su',
                userStore: 'system',
            },
            principals: ['role:system.admin'],
        },
        showMessages
    );
};

exports.get = handleGet;
