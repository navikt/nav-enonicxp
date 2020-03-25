const libs = {
    thymeleaf: require('/lib/thymeleaf'),
    portal: require('/lib/xp/portal'),
    content: require('/lib/xp/content'),
    utils: require('/lib/nav-utils'),
    lang: require('/lib/i18nUtil'),
    cache: require('/lib/siteCache'),
    common: require('/lib/xp/common'),
};
const view = resolve('faq-page.html');

function getSocialRef(el, content, req) {
    if (!req) {
        return null;
    }
    switch (el) {
        case 'facebook':
            return (
                'https://www.facebook.com/sharer/sharer.php?u=' +
                req.url +
                '&amp;title=' +
                content.displayName.replace(/ /g, '%20')
            );
        case 'twitter':
            return (
                'https://twitter.com/intent/tweet?text=' +
                content.displayName.replace(/ /g, '%20') +
                ': ' +
                req.url
            );
        case 'linkedin':
            return (
                'https://www.linkedin.com/shareArticle?mini=true&amp;url=' +
                req.url +
                '&amp;title=' +
                content.displayName.replace(/ /g, '%20') +
                '&amp;source=nav.no'
            );
        default:
            return null;
    }
}

function renderPage(req) {
    return () => {
        const content = libs.portal.getContent();

        const langBundle = libs.lang.parseBundle(content.language).main_article;
        const languages = libs.utils.getLanguageVersions(content);
        const data = content.data;
        const hasFact = !!data.fact;

        // Sosiale medier
        let socials = false;
        if (data.social) {
            socials = Array.isArray(data.social) ? data.social : [data.social];
        }
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

        // Prosessering av HTML-felter (håndtere url-er inne i html-en) og image-urls
        data.text = libs.portal.processHtml({
            value: data.text,
        });
        if (hasFact) {
            data.fact = libs.portal.processHtml({
                value: data.fact,
            });
        }
        if (data.image) {
            data.imageUrl = libs.utils.getImageUrl(data.image, 'max(768)');
        }
        const questionsAndAnswers = libs.utils
            .forceArray(content.data.questionsAndAnswers)
            .map(item => ({ ...item, elementId: libs.common.sanitize(item.question) }));

        const overview = questionsAndAnswers.map(qanda => {
            return { url: `#${libs.common.sanitize(qanda.question)}`, text: qanda.question };
        });

        // Definer model og kall rendring (view)
        const model = {
            published: libs.utils.dateTimePublished(content, content.language || 'no'),
            content,
            overview,
            questionsAndAnswers,
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

exports.get = function(req) {
    // Midlertidig fix: Kaller render-function direkte for driftsmeldinger
    // TODO: Sette tilbake når cache fungerer

    const render = renderPage(req);
    if (req.path.indexOf('/driftsmeldinger/') !== -1) {
        return render();
    }
    return libs.cache.getPaths(req.rawPath, 'faq-page', req.branch, render);
};
