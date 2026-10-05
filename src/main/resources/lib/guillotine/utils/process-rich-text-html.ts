import * as portalLib from '/lib/xp/portal';
import { generateUUID } from '../../utils/uuid';

type RichTextLink = {
    contentId: string;
    linkRef: string;
};

export type ProcessedRichText = {
    raw: string;
    processedHtml: string;
    macrosAsJson: unknown[];
    images: unknown[];
    links: RichTextLink[];
};

const contentLinkTagRegex = /<a\s[^>]*href="content:\/\/([^"?#]+)[^>]*>/g;

// Adds a data-link-ref attribute to content links, and collects the links. The RichText
// processedHtml resolver uses these links to resolve public paths (see richtext.ts)
const addContentLinkRefs = (html: string) => {
    const links: RichTextLink[] = [];

    const htmlWithLinkRefs = html.replace(contentLinkTagRegex, (tag: string, contentId: string) => {
        const linkRef = generateUUID();
        links.push({ contentId, linkRef });
        return tag.replace(/>$/, ` data-link-ref="${linkRef}">`);
    });

    return { htmlWithLinkRefs, links };
};

// Replacement for processHtml from lib-guillotine, which is not available for XP 8. Returns the
// same shape as the RichText type in the Guillotine app schema.
//
// TODO (xp8-upgrade): macros and images are not resolved by lib-portal. Port the html
// processing from lib-guillotine (custom html/macro processors) to a Java bean to fix this.
export const processRichTextHtml = (html: string): ProcessedRichText => {
    const { htmlWithLinkRefs, links } = addContentLinkRefs(html);

    return {
        raw: html,
        processedHtml: portalLib.processHtml({ value: htmlWithLinkRefs, type: 'server' }),
        macrosAsJson: [],
        images: [],
        links,
    };
};
