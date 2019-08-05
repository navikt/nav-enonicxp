const libs = {
    thymeleaf: require('/lib/thymeleaf'),
    portal: require('/lib/xp/portal'),
    content: require('/lib/xp/content'),
};
const view = resolve('contentAZ.html');

function handleGet (req) {
    const letter = req.params.letter;
    let list = [];
    if (letter) {
        const langauge = req.path.indexOf('/en/') !== -1 ? 'en' : 'no';
        let footerAZList = '/www.nav.no/no/innhold-a-aa';
        if (langauge === 'en') {
            footerAZList = '/www.nav.no/en/content-a-z';
        }
        list = libs.content
            .getChildren({
                key: footerAZList,
                start: 0,
                count: 10000,
            })
            .hits.filter(el => {
                return (
                    (el.type === app.name + ':internal-link' || el.type === app.name + ':external-link') &&
                    el.displayName.toLowerCase().startsWith(letter)
                );
            })
            .map(el => {
                let url;
                if (el.type === app.name + ':internal-link') {
                    url = libs.portal.pageUrl({
                        id: el.data.target,
                    });
                } else if (el.type === app.name + ':external-link') {
                    url = el.data.url;
                }
                return {
                    heading: el.displayName,
                    url,
                };
            });
    }

    const params = {
        hasList: list.length > 0,
        list,
    };

    return {
        contentType: 'text/html',
        body: libs.thymeleaf.render(view, params),
    };
}

exports.get = handleGet;
