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
    // Hent ut globale varsler
    return libs.content
        .getChildren({
            key: '/www.nav.no/global-notifications',
            start: 0,
            count: 2,
            sort: '_manualordervalue DESC',
        })
        .hits.filter((item) => item.type === 'no.nav.navno:notification');
};

const getLocalMessages = (contentPath) => {
    // Hent alle varsler som er i min path
    let result = libs.content
        .query({
            query: '',
            count: 100,
            contentTypes: [`${app.name}:notification`],
        })
        .hits.filter((item) =>
            contentPath.contains(item._path.slice(0, item._path.lastIndexOf('/')))
        );
    // Ved flere varsler: Sorter hierarkisk
    result = result.sort((a, b) => {
        const aPathDepth = a._path.split('/').length;
        const bPathDepth = b._path.split('/').length;
        return aPathDepth - bPathDepth;
    });

    return libs.navUtils.forceArray(result);
};

const getHeading = (message, target) => {
    const targetName = target ? target.displayName : '';
    return message.data.title || targetName;
};

const getDescription = (message, target) => {
    if (message && message.data && message.data.showDescription) {
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

const showMessages = (content) => {
    let body = null;
    const language = content.language || 'no';
    let global = getGlobalMessages();
    const local = getLocalMessages(content._path);

    if (global || local) {
        // Fjern eventuelle globale varsler som skal erstattes
        if (global) {
            const removedWarnings = [];
            local.forEach((localMessage) => {
                const localSubId = localMessage.data.notificationToReplaceId;
                if (localSubId && removedWarnings.indexOf(localSubId) === -1) {
                    global = global.filter((item) => item._id !== localSubId);
                    removedWarnings.push(localSubId);
                }
            });
        }
        const messages = global.concat(local).map((item) => constructMessage(item, language));

        if (messages.length > 0) {
            const langBundle = libs.lang.parseBundle(content.language).notifications;
            const label = (langBundle && langBundle.label) || '';
            body = libs.thymeleaf.render(view, {
                messages,
                label,
                containerClass: messages.length === 1 ? 'one-col' : '',
            });
        }
    }
    return {
        contentType: 'text/html',
        body,
    };
};

const handleGet = (req) => {
    // Cacher pr path i 60 sekunder. Vil unnslippe komplisert logikk
    // med individuell cacheinvalidering.

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
        () => {
            const content = libs.portal.getContent();
            return libs.cache.getNotificationsLegacy(
                content._path,
                'notifications',
                'master',
                showMessages,
                content
            );
        }
    );
};

exports.get = handleGet;
