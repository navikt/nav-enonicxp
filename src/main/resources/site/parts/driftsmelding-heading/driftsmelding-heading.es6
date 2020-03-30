const libs = {
    thymeleaf: require('/lib/thymeleaf'),
    portal: require('/lib/xp/portal'),
    content: require('/lib/xp/content'),
    context: require('/lib/xp/context'),
    lang: require('/lib/i18nUtil'),
    cache: require('/lib/siteCache'),
};
const view = resolve('driftsmelding-heading.html');

const getLinkText = (message, target, language) => {
    const defaultText = libs.lang.parseBundle(language).message.linktext;

    if (message.data.type === 'info' || message.data.type === 'warning') {
        return target ? message.data.title || target.displayName : defaultText;
    }
    return defaultText;
};

const getHeading = (message, target) => {
    if (message.data.type === 'info' || message.data.type === 'warning') {
        if (target) {
            return message.data.title || target.displayName;
        }
        return message.data.title || message.displayName;
    }
    return message.displayName;
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
        const text = getText(message, targetArticle);
        return {
            heading,
            url,
            linktext,
            text,
        };
    }
    return false;
};

const showMessages = () => {
    let body = null;
    const result = libs.content.getChildren({
        key: '/www.nav.no/no/driftsmeldinger',
        start: 0,
        count: 10,
        sort: 'publish.from DESC',
    });

    let hasMessages = false;
    const messages = result.hits
        .filter(item => item.type === 'no.nav.navno:melding' && item.data.exposureLevel === 'site')
        .reduce(
            (agg, item) => {
                agg[item.data.type].push(item);
                hasMessages = true;
                return agg;
            },
            {
                prodstatus: [],
                info: [],
                error: [],
            }
        );

    if (hasMessages) {
        const content = libs.portal.getContent();
        const language = content.language || 'no';

        const prodStatus =
            messages.prodstatus.length >= 1
                ? constructMessage(messages.prodstatus[0], language)
                : false;

        const infoMsg =
            messages.info.length >= 1 ? constructMessage(messages.info[0], language) : false;

        const model = {
            prodStatus,
            infoMsg,
        };

        body = libs.thymeleaf.render(view, model);
    }

    return {
        contentType: 'text/html',
        body,
    };
};

const handleGet = req => {
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
