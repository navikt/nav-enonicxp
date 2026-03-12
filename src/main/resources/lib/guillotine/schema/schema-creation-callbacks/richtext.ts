import * as contentLib from '/lib/xp/content';
import striptags from '/assets/striptags/3.2.0/src/striptags';
import { CreationCallback } from '../../utils/creation-callback-utils';
import { getPublicPath } from '../../../paths/public-path';
import { getLocaleFromContext } from '../../../localization/locale-context';
import { logger } from '../../../utils/logging';
import { getGuillotineContentQueryBaseContentId } from '../../utils/content-query-context';
import { stripPathPrefix } from '../../../paths/path-utils';

type Link = {
    contentId: string;
    linkRef: string;
    uri: string;
};

const macroTagName = 'editor-macro';

const linebreakFilter = new RegExp(/(\r\n|\n|\r|\s)/g);

const macroTagFilter = new RegExp(`<${macroTagName}[^>]*>(.*?)</${macroTagName}>`, 'g');

const resolvePublicPathsInLinks = (processedHtml: string, links?: Link[]) => {
    if (!links || links.length === 0) {
        return processedHtml;
    }

    const localeFromContext = getLocaleFromContext();
    const baseContentId = getGuillotineContentQueryBaseContentId();

    return links.reduce((html, link) => {
        const { contentId } = link;
        if (!contentId) {
            return html;
        }

        const targetContent = contentLib.get({ key: contentId });
        if (!targetContent) {
            logger.error(
                `Invalid reference to contentId ${contentId} in html-area on [${localeFromContext}] ${baseContentId}`,
                true,
                true
            );
            return html;
        }

        const internalPath = stripPathPrefix(targetContent._path);
        const publicPath = getPublicPath(targetContent, localeFromContext);

        return html.replace(new RegExp(`href="${internalPath}(["?#])`, 'g'), (match) =>
            match.replace(internalPath, publicPath)
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
