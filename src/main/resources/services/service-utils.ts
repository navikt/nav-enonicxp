const getServiceName = (req: XP.Request) => req.contextPath.split('/').slice(-1)[0];

export const getSubPath = (req: XP.Request) =>
    req.path
        .split(getServiceName(req))
        .slice(-1)[0]
        .replace(/(^\/)|(\/$)/, ''); // Trim leading/trailing slash

// If no icon was provided with the selector hit, use this as default
// (edit/pencil icon from nav-ds)
const defaultIcon =
    '' +
    '<svg width="20px" height="20px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" focusable="false" role="img">' +
    '<path' +
    ' fill-rule="evenodd"' +
    ' clip-rule="evenodd"' +
    ' d="M22.835 1.165a3.976 3.976 0 010 5.623L8.073 21.549.682 24 0 23.318l2.45-7.392L17.21 1.165a3.977 3.977 0 015.624 0zm-4.218 7.029l-2.811-2.812L4.188 17l-1.393 4.205 4.207-1.395L18.618 8.194zM21.43 2.57a1.989 1.989 0 00-2.703-.1l-.108.1-1.406 1.406 2.811 2.812 1.406-1.406a1.988 1.988 0 00.101-2.703l-.1-.109z"' +
    ' fill="#000">' +
    '</path>' +
    '</svg>';

const iconWithLink = (href: string, iconData: string = defaultIcon) => {
    return `<a href="${href}" onclick='(e) => {e.preventDefault();window.open(${href}, "_blank")}'>${iconData}</a>`;
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
            data: iconWithLink(url, hit.icon?.data),
            type: hit.icon?.type || 'image/svg+xml',
        },
    };
};
