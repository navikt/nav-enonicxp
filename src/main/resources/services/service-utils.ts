import { Content } from '/lib/xp/content';
import { customSelectorEditIcon } from './custom-selector-icons';

type CustomSelectorUsageHit = {
    name: string;
    path: string;
    id: string;
};

export const transformUsageHit = (content: Content): CustomSelectorUsageHit => ({
    name: content.displayName,
    path: content._path,
    id: content._id,
});

const getServiceName = (req: XP.Request) => req.contextPath.split('/').slice(-1)[0];

export const getSubPath = (req: XP.Request) =>
    req.path
        .split(getServiceName(req))
        .slice(-1)[0]
        .replace(/(^\/)|(\/$)/, ''); // Trim leading/trailing slash

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
    url: string
): XP.CustomSelectorServiceResponseHit => {
    return {
        ...hit,
        icon: {
            data: iconWithLink(url, hit.icon?.data || customSelectorEditIcon.data),
            type: hit.icon?.type || customSelectorEditIcon.type,
        },
    };
};
