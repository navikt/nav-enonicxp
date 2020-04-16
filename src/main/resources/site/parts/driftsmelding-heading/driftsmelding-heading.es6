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
    prodstatus: {
        class: 'status',
        icon: 'alertstripe__ikon_advarsel.svg',
    },
    info: {
        class: 'info',
        icon: 'alertstripe__ikon_info.svg',
    },
};

const getDescription = message => {
    if (message.data.showDescription && message.data.ingress) {
        return message.data.ingress;
    }
    return '';
};

const getUpdated = (message, language) => {
    if (message.data.showUpdated) {
        const updated = message.modifiedTime;
        if (updated) {
            return libs.navUtils.dateTimeUpdated(updated, language);
        }
    }
    return null;
};

const constructMessage = (message, language) => {
    if (message && message.data) {
        const messageProps = messagesProps[message.data.type] || {};
        const heading = message.displayName;
        const url = message._path;
        const description = getDescription(message);
        const updated = getUpdated(message, language);
        const iconUrl =
            messageProps.icon &&
            libs.portal.assetUrl({
                path: 'img/navno/' + messageProps.icon,
            });
        return {
            heading,
            description,
            updated,
            url,
            iconUrl,
            class: messageProps.class,
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
        count: 2,
        sort: '_manualordervalue DESC',
    });
    const messages = result.hits
        .filter(item => item.type === 'no.nav.navno:melding')
        .map(item => constructMessage(item, language));

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

const handleGet = req => {
    const content = libs.portal.getContent();
    const language = content.language || 'no';

    // Må kjøre i context av master-branch, ellers vil preview i Content studio
    // alltid vise en driftsmelding
    return libs.cache.getPaths(`driftsmelding-heading-${language}`, undefined, req.branch, () => {
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
    });
};

exports.get = handleGet;
