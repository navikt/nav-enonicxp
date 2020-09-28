const libs = {
    thymeleaf: require('/lib/thymeleaf'),
    portal: require('/lib/xp/portal'),
    content: require('/lib/xp/content'),
    utils: require('/lib/nav-utils'),
    lang: require('/lib/i18nUtil'),
    cache: require('/lib/siteCache'),
};
const view = resolve('main-article.html');

function renderPage(req) {
    return () => {
        let content = libs.portal.getContent();
        if (content.type === app.name + ':main-article-chapter') {
            content = libs.content.get({
                key: content.data.article,
            });
        }
        const langBundle = libs.lang.parseBundle(content.language).main_article;
        const data = content.data;
        const hasFact = !!data.fact;
        let htmlText = data.text;

        // Innholdsfortegnelse
        const toc = [];
        if (data.hasTableOfContents && data.hasTableOfContents !== 'none') {
            let count = 0;
            let ch = 1;
            let ind = htmlText.indexOf('<h3>');

            while (ind !== -1 && count < 100) {
                const h2End = ind + 4;
                const ssEnd = htmlText.indexOf('</h3>', ind);
                const ss = htmlText
                    .slice(h2End, ssEnd)
                    .replace(/<([^>]+)>/gi, '') // Strip html
                    .replace(/&nbsp;/gi, ' '); // Replace &nbsp;
                count++;
                toc.push(ss);
                htmlText = htmlText.replace(
                    '<h3>',
                    '<h3 id="chapter-' + ch++ + '" tabindex="-1" class="chapter-header">'
                );
                ind = htmlText.indexOf('<h3>');
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
                      href: libs.utils.getSocialRef(el, content, req),
                  };
              })
            : false;

        // Prosessering av HTML-felter (håndtere url-er inne i html-en) og image-urls
        htmlText = libs.portal.processHtml({
            value: htmlText,
        });
        // Fjern tomme headings og br-tagger fra HTML
        htmlText = htmlText.replace(/<h\d>\s*<\/h\d>/g, '');
        htmlText = htmlText.replace(/<h\d>&nbsp;<\/h\d>/g, '');
        htmlText = htmlText.replace(/<br \/>/g, '');
        const htmlFact = hasFact
            ? libs.portal.processHtml({
                  value: data.fact,
              })
            : null;
        const picture = !!data.picture && data.picture.target; // Data model after 28.09.2020?
        let imageObj = null;
        if (picture || !!data.image) {
            const image = picture ? data.picture : data.image; // Pointer to image (both data models)
            imageObj = {
                url: libs.utils.getImageUrl(picture ? image.target : image, 'max(768)'),
                size: picture ? image.imagesize : data.imagesize,
                caption: picture ? image.caption : data.caption,
                altText: picture ? image.altText : '',
            };
        }
        // Definer model og kall rendring (view)
        const model = {
            displayName: content.displayName,
            published: libs.utils.dateTimePublished(content, content.language || 'no'),
            publishedFrom: content.publish.from,
            ingress: data.ingress,
            hasTableOfContents: toc.length > 0,
            toc,
            htmlText,
            hasFact,
            htmlFact,
            imageObj,
            socials,
            langBundle,
        };
        return {
            body: libs.thymeleaf.render(view, model),
        };
    };
}

exports.get = function (req) {
    const render = renderPage(req);
    return libs.cache.getPaths(req.rawPath, 'main-article', req.branch, render);
};
