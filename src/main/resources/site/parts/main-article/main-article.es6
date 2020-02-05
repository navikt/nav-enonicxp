const libs = {
    thymeleaf: require('/lib/thymeleaf'),
    portal: require('/lib/xp/portal'),
    content: require('/lib/xp/content'),
    utils: require('/lib/nav-utils'),
    lang: require('/lib/i18nUtil'),
    cache: require('/lib/cacheControll'),
};
const view = resolve('main-article.html');

function getSocialRef(el, content, req) {
    if (!req) {
        return null;
    }
    switch (el) {
        case 'facebook':
            return 'http://www.facebook.com/sharer/sharer.php?u=' + req.url + '&amp;title=' + content.displayName.replace(/ /g, '%20');
        case 'twitter':
            return 'http://twitter.com/intent/tweet?text=' + content.displayName.replace(/ /g, '%20') + ': ' + req.url;
        case 'linkedin':
            return (
                'http://www.linkedin.com/shareArticle?mini=true&amp;url='
                    + req.url
                    + '&amp;title='
                    + content.displayName.replace(/ /g, '%20')
                    + '&amp;source=nav.no'
            );
        default:
            return null;
    }
}

function renderPage(req) {
    return () => {
        let content = libs.portal.getContent();
        if (content.type === app.name + ':main-article-chapter') {
            content = libs.content.get({
                key: content.data.article,
            });
        }
        const langBundle = libs.lang.parseBundle(content.language).main_article;
        const languages = libs.utils.getLanguageVersions(content);
        const data = content.data;
        const hasFact = !!data.fact;

        // Innholdsfortegnelse
        const toc = [];
        // TODO Remove the Kort_om hardcode after migrations has
        // set h3 correctly on all old Kort_om articles
        if ((data.hasTableOfContents && data.hasTableOfContents !== 'none')
            || (content.x && content.x['no-nav-navno'] && content.x['no-nav-navno'].oldContentType && content.x['no-nav-navno'].oldContentType.type === app.name + ':Kort_om')) {
            let count = 0;
            let ch = 1;
            let ind = data.text.indexOf('<h3>');

            while (ind !== -1 && count < 100) {
                const h2End = ind + 4;
                const ssEnd = data.text.indexOf('</h3>', ind);
                const ss = data.text
                    .slice(h2End, ssEnd)
                    .replace(/<([^>]+)>/ig, '') // Strip html
                    .replace(/&nbsp;/ig, ' '); // Replace &nbsp;
                count++;
                toc.push(ss);
                data.text = data.text.replace('<h3>', '<h3 id="chapter-' + ch++ + '" tabindex="-1" class="chapter-header">');
                ind = data.text.indexOf('<h3>');
            }
        }

        // Sosiale medier
        let socials = false;
        if (data.social) {
            socials = Array.isArray(data.social) ? data.social : [data.social];
        }

        socials = socials
            ? socials.map((el) => {
                let tmpText = 'Del på ';
                if (el === 'linkedin') {
                    tmpText += 'LinkedIn';
                } else if (el === 'facebook') {
                    tmpText += 'Facebook';
                } else {
                    tmpText += 'Twitter';
                }
                return {
                    type: el,
                    text: tmpText,
                    href: getSocialRef(el, content, req),
                };
            })
            : false;

        // Prosessering av HTML-felter (håndtere url-er inne i html-en)
        data.text = libs.portal.processHtml({
            value: data.text,
        });
        if (hasFact) {
            data.fact = libs.portal.processHtml({
                value: data.fact,
            });
        }
        if (data.image) {
            data.imageUrl = libs.portal.imageUrl({
                id: data.image,
                scale: 'block(1024,768)',
            });
        }

        // Definer modell og kall rendring (view)
        const model = {
            published: libs.utils.dateTimePublished(content, content.language || 'no'),
            hasTableOfContents: toc.length > 0,
            toc,
            content,
            hasFact,
            hasLanguageVersions: languages.length > 0,
            languages,
            socials,
            langBundle,
        };
        return {
            body: libs.thymeleaf.render(view, model),
        };
    };
}

exports.get = function (req) {
    // Midlertidig fix: Kaller render-function direkte for driftsmeldinger
    // TODO: Sette tilbake når cache fungerer

    const render = renderPage(req);
    if (req.path.indexOf('/driftsmeldinger/') !== -1) {
        return render();
    }
    return libs.cache.getPaths(req.rawPath, 'main-article', req.branch, render);
};
