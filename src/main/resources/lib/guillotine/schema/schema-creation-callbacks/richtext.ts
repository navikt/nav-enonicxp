import * as contentLib from '/lib/xp/content';
import striptags from '/assets/striptags/3.1.1/src/striptags';
import { CreationCallback } from '../../utils/creation-callback-utils';
import { getPublicPath } from '../../../paths/public-path';
import { getLocaleFromContext } from '../../../localization/locale-context';
import { logger } from '../../../utils/logging';
import { getGuillotineContentQueryBaseContentId } from '../../utils/content-query-context';

type Links = {
    contentId: string;
    linkRef: string;
};

const macroTagName = 'editor-macro';

const linebreakFilter = new RegExp(/(\r\n|\n|\r|\s)/g);

const macroTagFilter = new RegExp(`<${macroTagName}[^>]*>(.*?)</${macroTagName}>`, 'g');

const resolvePublicPathsInLinks = (processedHtml: string, links?: Links[]) => {
    if (!links || links.length === 0) {
        return processedHtml;
    }

    const localeFromContext = getLocaleFromContext();
    const baseContentId = getGuillotineContentQueryBaseContentId();

    return links.reduce((html, link) => {
        const { contentId, linkRef } = link;
        if (!contentId || !linkRef) {
            return html;
        }

        const targetContent = contentLib.get({ key: contentId });
        if (!targetContent) {
            logger.warning(
                `Invalid reference to contentId ${contentId} in html-area on [${localeFromContext}] ${baseContentId}`,
                true
            );
            return html;
        }

        const publicPath = getPublicPath(targetContent, localeFromContext);

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
            ? resolvePublicPathsInLinks(processedHtml, links)
                  // Strip linebreaks, as it may cause errors in the frontend parser
                  .replace(linebreakFilter, ' ')
                  // Strip html tags from the body of macro-tags. Fixes invalid html-nesting caused by the CS editor
                  .replace(macroTagFilter, (match: string) => {
                      return striptags(match, [macroTagName]);
                  })
            : processedHtml;
    };
};
