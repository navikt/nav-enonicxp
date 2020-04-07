const libs = {
    thymeleaf: require('/lib/thymeleaf'),
    portal: require('/lib/xp/portal'),
    content: require('/lib/xp/content'),
    context: require('/lib/xp/context'),
    lang: require('/lib/i18nUtil'),
    cache: require('/lib/siteCache'),
    navUtils: require('/lib/nav-utils'),
};
const view = resolve('driftsmelding-heading.html');
const messagesProps = {
    warning: {
        class: 'warning',
        icon: null,
    },
    prodstatus: {
        class: 'status',
        icon: 'alertstripe__ikon_advarsel.svg',
    },
    info: {
        class: 'info',
        icon: 'alertstripe__ikon_info.svg',
    },
};

const getHeading = (message, target) => {
    if (target) {
        return message.data.title || target.displayName;
    }
    return message.data.title || message.displayName;
};

const getDescription = (message, target) => {
    if (message.data.showDescription) {
        if (target) {
            return target.data.ingress || target.data.description || null;
        }
        return message.data.ingress || null;
    }
    return null;
};

const getUpdated = (message, target, language) => {
    if (message.data.showUpdated) {
        const updated = target ? target.modifiedTime : message.modifiedTime;
        if (updated) {
            return `Oppdatert: ${libs.navUtils.formatDateTime(updated, language)}`;
        }
    }
    return null;
};

const constructMessage = message => {
    if (message && message.data) {
        const content = libs.portal.getContent();
        const language = content.language || 'no';
        const target = message.data.target
            ? libs.content.get({
                  key: message.data.target,
              })
            : null;
        const url = libs.portal.pageUrl({
            path: target ? target._path : message._path,
        });
        const messageProps = messagesProps[message.data.type];
        const heading = getHeading(message, target);
        const description = getDescription(message, target);
        const updated = getUpdated(message, target, language);
        const iconUrl =
            messageProps.icon &&
            libs.portal.assetUrl({
                path: 'img/navno/' + messageProps.icon,
                type: 'absolute',
            });
        return {
            heading,
            description,
            updated,
            url,
            iconUrl,
            class: messageProps.class || '',
        };
    }
    return false;
};

const showMessages = () => {
    let body = null;
    const result = libs.content.getChildren({
        key: '/www.nav.no/no/driftsmeldinger',
        start: 0,
        count: 4,
        sort: '_manualordervalue DESC',
    });
    const messages = result.hits
        .filter(item => item.type === 'no.nav.navno:melding' && item.data.exposureLevel === 'site')
        .map(item => constructMessage(item));

    if (messages.length > 0) {
        body = libs.thymeleaf.render(view, {
            messages,
        });
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
