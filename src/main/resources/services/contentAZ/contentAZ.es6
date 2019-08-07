const libs = {
    thymeleaf: require('/lib/thymeleaf'),
    portal: require('/lib/xp/portal'),
    content: require('/lib/xp/content'),
};
const view = resolve('contentAZ.html');

/*
  Innhold til Footer A-Å betår av lenker som er lagt inn i mappe for dette + siste nivå fra hovedmenyen
 */
function handleGet (req) {
    const letter = req.params.letter;
    let list = [];
    if (letter) {
        const language = req.path.indexOf('/en/') !== -1 ? 'en' : 'no';
        const footerAZList = (language === 'en' ? '/www.nav.no/en/content-a-z' : '/www.nav.no/no/innhold-a-aa');
        const azList = libs.content.getChildren({
            key: footerAZList,
            start: 0,
            count: 1000,
        }).hits
            .filter(el => (
                (el.type === app.name + ':internal-link' || el.type === app.name + ':external-link') &&
                el.displayName.toLowerCase().startsWith(letter)
            ));
        const menuList = libs.content.query({
            start: 0,
            count: 1000,
            query: 'type = "no.nav.navno:megamenu-item"',
        }).hits
            .filter(el => (
                !el.hasChildren &&
                el._path.indexOf(language === 'en' ? '/en/' : '/no/') !== -1 &&
                el.data.showInAZList &&
                el.displayName.toLowerCase().startsWith(letter)
            ));
        list = azList.concat(menuList)
            .sort( (a,b) => {
                if ( a.displayName < b.displayName) {
                    return -1;
                }
                if ( a.displayName > b.displayName) {
                    return 1;
                }
                return 0;
            })
            .map(el => {
                let url;
                if (el.type === app.name + ':internal-link' || el.type === app.name + ':megamenu-item') {
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
