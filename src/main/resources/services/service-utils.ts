import { Request } from '@enonic-types/core';
import { customSelectorEditIcon } from './custom-selector-icons';
import { buildEditorPathFromContext } from '../lib/paths/editor-path';
import { stripLeadingAndTrailingSlash } from '../lib/paths/path-utils';

export type CustomSelectorServiceResponseHit = {
    id: string;
    displayName: string;
    description?: string;
    icon?: {
        data: string;
        type: string;
    };
};

const getServiceName = (req: Request) => req.contextPath?.split('/').slice(-1)[0] || '';

export const getServiceRequestSubPath = (req: Request) => {
    return stripLeadingAndTrailingSlash(req.path.split(getServiceName(req)).slice(-1)[0]);
};

// We can't use target or onclick to make the link open in a new tab, as content studio removes
// these attributes when parsing the dom elements from the customselector icon. We set a classname
// instead and work around this in the frontend.
const iconWithLink = (href: string, iconData: string) => {
    return `<a href="${href}" class="custom-selector-link">${iconData}</a>`;
};

// Injects a link in the optional icon field of a customselector hit object
// (this is almost certainly not an intended usage, but it works :D)
export const customSelectorHitWithLink = (
    hit: CustomSelectorServiceResponseHit,
    contentId: string
): CustomSelectorServiceResponseHit => {
    const editorPath = buildEditorPathFromContext(contentId);

    return {
        ...hit,
        icon: {
            data: iconWithLink(editorPath, hit.icon?.data || customSelectorEditIcon.data),
            type: hit.icon?.type || customSelectorEditIcon.type,
        },
    };
};

export const customSelectorParseSelectedIdsFromReq = (req: Request): string[] => {
    const { ids } = req.params;
    if (!ids) {
        return [];
    }

    return Array.isArray(ids) ? ids : ids.split(',');
};
