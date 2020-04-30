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
        iconSVG:'<svg width="24px" height="24px" viewBox="0 0 24 24" version="1.1">\n' +
            '    <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">\n' +
            '        <g transform="translate(-222.000000, -106.000000)" fill="currentColor">\n' +
            '            <g id="New-icons-2px/24px/warning" transform="translate(222.000000, 106.000000)">\n' +
            '                <path d="M12,0 C18.627417,0 24,5.372583 24,12 C24,18.627417 18.627417,24 12,24 C5.372583,24 0,18.627417 0,12 C0,5.372583 5.372583,0 12,0 Z M12,2 C6.4771525,2 2,6.4771525 2,12 C2,17.5228475 6.4771525,22 12,22 C17.5228475,22 22,17.5228475 22,12 C22,6.4771525 17.5228475,2 12,2 Z M12,16 C12.8284271,16 13.5,16.6715729 13.5,17.5 C13.5,18.3284271 12.8284271,19 12,19 C11.1715729,19 10.5,18.3284271 10.5,17.5 C10.5,16.6715729 11.1715729,16 12,16 Z M13,5 L13,14 L11,14 L11,5 L13,5 Z" />\n' +
            '            </g>\n' +
            '        </g>\n' +
            '    </g>\n' +
            '</svg>'
    },
    info: {
        class: 'info',
        iconSVG: '<svg width="24px" height="24px" viewBox="0 0 24 24" version="1.1">\n' +
            '    <g id="News-varsel" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">\n' +
            '        <g transform="translate(-164.000000, -106.000000)" fill="currentColor">\n' +
            '            <g transform="translate(164.000000, 106.000000)">\n' +
            '                <path d="M12,0 C18.627417,0 24,5.372583 24,12 C24,18.627417 18.627417,24 12,24 C5.372583,24 0,18.627417 0,12 C0,5.372583 5.372583,0 12,0 Z M12,2 C6.4771525,2 2,6.4771525 2,12 C2,17.5228475 6.4771525,22 12,22 C17.5228475,22 22,17.5228475 22,12 C22,6.4771525 17.5228475,2 12,2 Z M9,19 L9,17 L11,17 L11,12 L9,12 L9,10 L13,10 L13,17 L15,17 L15,19 L9,19 Z M12,5 C12.8284271,5 13.5,5.67157288 13.5,6.5 C13.5,7.32842712 12.8284271,8 12,8 C11.1715729,8 10.5,7.32842712 10.5,6.5 C10.5,5.67157288 11.1715729,5 12,5 Z" />\n' +
            '            </g>\n' +
            '        </g>\n' +
            '    </g>\n' +
            '</svg>\n'
    },
};

const constructMessage = (message, language) => {
    if (message && message.data) {
        const heading = message.displayName;
        const url = libs.portal.pageUrl({ path: message._path });
        const messageProps = messagesProps[message.data.type] || {};
        return {
            heading,
            url,
            iconSVG: messageProps.iconSVG,
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
