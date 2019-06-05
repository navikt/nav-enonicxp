const libs = {
    thymeleaf: require('/lib/thymeleaf'),
    portal: require('/lib/xp/portal'),
    utils: require('/lib/nav-utils'),
    lang: require('/lib/i18nUtil'),
    cache: require('/lib/cacheControll'),
};
const view = resolve('main-article.html');

exports.get = function (req) {
    return libs.cache.getPaths(req.path, 'main-article', () => {
        const content = libs.portal.getContent();
        const lang = libs.lang.parseBundle(content.language);
        const data = content.data;
        let text = data.text;
        let tocs = [];

        if (
            (data.hasTableOfContents && data.hasTableOfContents !== 'none') ||
            (data.metaTags && data.metaTags.indexOf('contentType$$$Kort_om') !== -1)
        ) {
            let count = 0;
            let ch = 1;
            let ind = text.indexOf('<h3>');

            while (ind !== -1 && count < 100) {
                const h2End = ind + 4;
                const ssEnd = text.indexOf('</h3>', ind);
                const ss = text.slice(h2End, ssEnd);
                count++;
                tocs.push(ss);
                text = text.replace('<h3>', '<h3 id="chapter-' + ch++ + '" tabindex="-1" class="chapter-header">');
                ind = text.indexOf('<h3>');
            }
        }

        const languages = libs.utils.getLanguageVersions(content);
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
                    text: text,
                    href: getSocialRef(el, content, req),
                };
            })
            : false;

        const model = {
            published: libs.utils.dateTimePublished(content, content.language || 'no'),
            hasTableOfContents: tocs.length > 0,
            tocs,
            content,
            hasFact: data.fact && data.fact !== '',
            hasLanguageVersions: languages.length > 0,
            languages,
            socials,
            lang,
        };

        // Render a thymeleaf template
        const body = libs.thymeleaf.render(view, model);
        // Return the result
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
