const libs = {
    thymeleaf: require('/lib/thymeleaf'),
    portal: require('/lib/xp/portal'),
    menu: require('/lib/menu'),
    lang: require('/lib/i18nUtil'),
    cache: require('/lib/cacheControll'),
};
const view = resolve('publishing-calendar.html');

function handleGet (req) {
    const content = libs.portal.getContent();
    const langBundles = libs.lang.parseBundle(content.language).publishing_calendar;
    const items = libs.content.getChildren({
        key: '/www.nav.no/no/nav-og-samfunn/publiseringskalender',
        start: 0,
        count: 100,
    }).hits.map(el => {
        return {
            displayName: el.displayName,
            period: el.data.period,
            day: '10.',
            month: 'juni',
        };
    });
    log.info(JSON.stringify(items, null, 4));
    const model = {
        langBundles,
        items,
    };
    return {
        contentType: 'text/html',
        body: libs.thymeleaf.render(view, model),
    };
}

exports.get = handleGet;
