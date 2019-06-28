const libs = {
    thymeleaf: require('/lib/thymeleaf'),
    portal: require('/lib/xp/portal'),
    content: require('/lib/xp/content'),
    lang: require('/lib/i18nUtil'),
    cache: require('/lib/cacheControll'),
};
const monthShortName = ['JAN', 'FEB', 'MAR', 'APR', 'MAI', 'JUN', 'JUL', 'AUG', 'SEP', 'OKT', 'NOV', 'DES'];
const view = resolve('publishing-calendar.html');

function handleGet (req) {
    return libs.cache.getPaths('publiseringskalender', undefined, () => {
        const content = libs.portal.getContent();
        const langBundle = libs.lang.parseBundle(content.language).publishing_calendar;
        const items = libs.content.getChildren({
            key: content._id,
            start: 0,
            count: 100,
        }).hits
            .map(el => {
                const publDate = new Date(el.data.date);
                return {
                    displayName: el.displayName,
                    period: el.data.period,
                    publDate,
                    day: publDate.getDate().toString() + '.',
                    month: monthShortName[publDate.getMonth()],
                };
            })
            .sort((a, b) => a.publDate - b.publDate); // Dato for publisering: stigende
        const model = {
            heading: content.displayName,
            ingress: content.data.ingress,
            langBundle,
            items,
        };
        return {
            contentType: 'text/html',
            body: libs.thymeleaf.render(view, model),
        };
    });
}

exports.get = handleGet;
