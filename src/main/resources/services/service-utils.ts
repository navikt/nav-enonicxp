import { customSelectorEditIcon } from './custom-selector-icons';
import { buildEditorPathFromContext } from '../lib/paths/editor-path';
import { stripLeadingAndTrailingSlash } from '../lib/paths/path-utils';

const getServiceName = (req: XP.Request) => req.contextPath.split('/').slice(-1)[0];

export const getServiceRequestSubPath = (req: XP.Request) =>
    stripLeadingAndTrailingSlash(req.path.split(getServiceName(req)).slice(-1)[0]);

// We can't use target or onclick to make the link open in a new tab, as content studio removes
// these attributes when parsing the dom elements from the customselector icon. We set a classname
// instead and work around this in the frontend.
const iconWithLink = (href: string, iconData: string) => {
    return `<a href="${href}" class="custom-selector-link">${iconData}</a>`;
};

// Injects a link in the optional icon field of a customselector hit object
// (this is almost certainly not an intended usage, but it works :D)
export const customSelectorHitWithLink = (
    hit: XP.CustomSelectorServiceResponseHit,
    contentId: string
): XP.CustomSelectorServiceResponseHit => {
    const editorPath = buildEditorPathFromContext(contentId);

    return {
        ...hit,
        icon: {
            data: iconWithLink(editorPath, hit.icon?.data || customSelectorEditIcon.data),
            type: hit.icon?.type || customSelectorEditIcon.type,
        },
    };
};

export const customSelectorParseSelectedIdsFromReq = (req: XP.Request): string[] => {
    const { ids } = req.params;
    if (!ids) {
        return [];
    }

    return Array.isArray(ids) ? ids : ids.split(',');
};
