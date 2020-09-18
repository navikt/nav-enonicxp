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

        // Innholdsfortegnelse
        const toc = [];
        if (data.hasTableOfContents && data.hasTableOfContents !== 'none') {
            let count = 0;
            let ch = 1;
            let ind = data.text.indexOf('<h3>');

            while (ind !== -1 && count < 100) {
                const h2End = ind + 4;
                const ssEnd = data.text.indexOf('</h3>', ind);
                const ss = data.text
                    .slice(h2End, ssEnd)
                    .replace(/<([^>]+)>/gi, '') // Strip html
                    .replace(/&nbsp;/gi, ' '); // Replace &nbsp;
                count++;
                toc.push(ss);
                data.text = data.text.replace(
                    '<h3>',
                    '<h3 id="chapter-' + ch++ + '" tabindex="-1" class="chapter-header">'
                );
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
                      href: libs.utils.getSocialRef(el, content, req),
                  };
              })
            : false;

        // Prosessering av HTML-felter (håndtere url-er inne i html-en) og image-urls
        data.text = libs.portal.processHtml({
            value: data.text,
        });
        // Fjern tomme headings og br-tagger fra HTML
        data.text = data.text.replace(/<h\d>\s*<\/h\d>/g, '');
        data.text = data.text.replace(/<h\d>&nbsp;<\/h\d>/g, '');
        data.text = data.text.replace(/<br \/>/g, '');
        if (hasFact) {
            data.fact = libs.portal.processHtml({
                value: data.fact,
            });
        }
        if (data.image) {
            data.imageUrl = libs.utils.getImageUrl(data.image, 'max(768)');
        }

        // Definer model og kall rendring (view)
        const model = {
            published: libs.utils.dateTimePublished(content, content.language || 'no'),
            hasTableOfContents: toc.length > 0,
            toc,
            content,
            hasFact,
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
