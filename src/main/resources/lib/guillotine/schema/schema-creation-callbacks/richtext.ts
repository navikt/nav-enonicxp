import * as contentLib from '/lib/xp/content';
import striptags from '/assets/striptags/3.1.1/src/striptags';
import { CreationCallback } from '../../utils/creation-callback-utils';
import { getPublicPath } from '../../../paths/public-path';
import { getLocaleFromContext } from '../../../localization/locale-context';
import { logger } from '../../../utils/logging';

type Links = {
    contentId: string;
    linkRef: string;
};

const macroTagName = 'editor-macro';

const linebreakFilter = new RegExp(/(\r\n|\n|\r|\s)/g);

const macroTagFilter = new RegExp(`<${macroTagName}[^>]*>(.*?)</${macroTagName}>`, 'g');

const insertPublicPathInLinks = (processedHtml: string, links?: Links[]) => {
    if (!links || links.length === 0) {
        return processedHtml;
    }

    return links.reduce((html, link) => {
        const { contentId, linkRef } = link;
        if (!contentId || !linkRef) {
            return html;
        }

        const content = contentLib.get({ key: contentId });
        if (!content) {
            logger.error(`Dead link in html-area i content id ${contentId}`, true);
            return html;
        }

        const locale = getLocaleFromContext();
        const publicPath = getPublicPath(content, locale);

        return html.replace(
            new RegExp(`<a href="([^"]*)" data-link-ref="${linkRef}"`, 'g'),
            (_, hrefCapture) => {
                const anchorId = hrefCapture.split('#')[1];
                return `<a href="${publicPath}${anchorId ? `#${anchorId}` : ''}"`;
            }
        );
    }, processedHtml);
};

export const richTextCallback: CreationCallback = (context, params) => {
    params.fields.processedHtml.resolve = (env) => {
        const { processedHtml, links } = env.source;

        return processedHtml
            ? insertPublicPathInLinks(processedHtml, links)
                  // Strip linebreaks, as it may cause errors in the frontend parser
                  .replace(linebreakFilter, ' ')
                  // Strip html tags from the body of macro-tags. Fixes invalid html-nesting caused by the CS editor
                  .replace(macroTagFilter, (match: string) => {
                      return striptags(match, [macroTagName]);
                  })
            : processedHtml;
    };
};
