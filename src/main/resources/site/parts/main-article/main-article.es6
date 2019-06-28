const libs = {
    thymeleaf: require('/lib/thymeleaf'),
    portal: require('/lib/xp/portal'),
    content: require('/lib/xp/content'),
    utils: require('/lib/nav-utils'),
    lang: require('/lib/i18nUtil'),
    cache: require('/lib/cacheControll'),
};
const view = resolve('main-article.html');

exports.get = function (req) {
    return libs.cache.getPaths(req.path, 'main-article', req.branch, () => {
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
        let toc = [];
        if (data.hasTableOfContents && data.hasTableOfContents !== 'none') {
            let count = 0;
            let ch = 1;
            let ind = data.text.indexOf('<h3>');

            while (ind !== -1 && count < 100) {
                const h2End = ind + 4;
                const ssEnd = data.text.indexOf('</h3>', ind);
                const ss = data.text.slice(h2End, ssEnd);
                count++;
                toc.push(ss);
                data.text = data.text.replace('<h3>', '<h3 id="chapter-' + ch++ + '" tabindex="-1" class="chapter-header">');
                ind = data.text.indexOf('<h3>');
            }
        }

        // Sosiale medier
        let socials = data.social ? (Array.isArray(data.social) ? data.social : [data.social]) : false;
        socials = socials
            ? socials.map(el => {
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
        const body = libs.thymeleaf.render(view, model);
        return {
            body,
        };
    });
};

function getSocialRef (el, content, req) {
    if (el === 'facebook') {
        return 'http://www.facebook.com/sharer/sharer.php?u=' + req.url + '&amp;title=' + content.displayName.replace(/ /g, '%20');
    } else if (el === 'twitter') {
        return 'http://twitter.com/intent/tweet?text=' + content.displayName.replace(/ /g, '%20') + ': ' + req.url;
    } else if (el === 'linkedin') {
        return (
            'http://www.linkedin.com/shareArticle?mini=true&amp;url=' +
            req.url +
            '&amp;title=' +
            content.displayName.replace(/ /g, '%20') +
            '&amp;source=nav.no'
        );
    }
}
