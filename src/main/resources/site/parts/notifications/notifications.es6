const libs = {
    thymeleaf: require('/lib/thymeleaf'),
    portal: require('/lib/xp/portal'),
    content: require('/lib/xp/content'),
    context: require('/lib/xp/context'),
    lang: require('/lib/i18nUtil'),
    cache: require('/lib/siteCache'),
    navUtils: require('/lib/nav-utils'),
};
const view = resolve('notifications.html');
const messagesProps = {
    warning: {
        class: 'warning',
        icon: null,
    },
    info: {
        class: 'info',
        icon: 'alertstripe__ikon_info.svg',
    },
};

const getGlobalMessages = () => {
    // Hent ut gobale varsler
    return libs.content
        .getChildren({
            key: '/www.nav.no/global-notifications',
            start: 0,
            count: 2,
            sort: '_manualordervalue DESC',
        })
        .hits.filter(item => item.type === 'no.nav.navno:notification');
};

const getLocalMessage = contentPath => {
    // Hent alle varsler som er i min path
    let result = libs.content
        .query({
            query: '',
            count: 100,
            contentTypes: [`${app.name}:notification`],
        })
        .hits.filter(item =>
            contentPath.contains(item._path.slice(0, item._path.lastIndexOf('/')))
        );
    // Ved flere varsler: Hent varselet som er lengst ned i hierarkiet
    if (result.length > 1) {
        result = result
            .map(item => {
                return { ...item, pathDepth: item._path.split('/').length };
            })
            .reduce((acc, current) => {
                return acc.pathDepth > current.pathDepth ? acc : current;
            }, []);
    }
    // Returnerer alltid bare et objekt
    if (Array.isArray(result)) {
        return result[0];
    }
    return result;
};

const getHeading = (message, target) => {
    return message.data.title || target.displayName;
};

const getDescription = (message, target) => {
    if (message.data.showDescription) {
        if (message.data.ingress) {
            return message.data.ingress;
        }
        if (target && target.data) {
            return target.data.ingress || target.data.description || '';
        }
    }
    return '';
};

const getUpdated = (message, target, language) => {
    if (message.data.showUpdated) {
        const updated = target ? target.modifiedTime : message.modifiedTime;
        if (updated) {
            return libs.navUtils.dateTimeUpdated(updated, language);
        }
    }
    return null;
};

const constructMessage = (message, language) => {
    if (message && message.data) {
        const target = message.data.target
            ? libs.content.get({
                  key: message.data.target,
              })
            : null;
        const url = libs.portal.pageUrl({
            path: target ? target._path : message._path,
        });
        const messageProps = messagesProps[message.data.type] || {};
        const heading = getHeading(message, target);
        const description = getDescription(message, target);
        const updated = getUpdated(message, target, language);
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

    // Hent ut globale varsler
    let messages = getGlobalMessages();

    // Hent ut eventuelt lokalt varsel
    const local = getLocalMessage(content._path);

    if (local && local.data) {
        // Fjern globalt varsel hvis det lokale skal ersatte dette
        if (local.data.notificationToReplaceId) {
            messages = messages.filter(item => item._id !== local.data.notificationToReplaceId);
        }
        messages.push(local);
    }
    messages = messages.map(item => constructMessage(item, language));

    if (messages.length > 0) {
        body = libs.thymeleaf.render(view, {
            messages,
            containerClass: messages.length === 1 ? 'one-col' : '',
        });
    }
    return {
        contentType: 'text/html',
        body,
    };
};

const handleGet = () => {
    // Ingen caching, da invalidering blir for komplisert/usikkert
    // Må kjøre i context av master-branch, ellers vil preview i Content studio
    // vise upubliserte varsler
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
