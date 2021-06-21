const {
    imageFragment,
    mediaAttachmentFragment,
} = require('/lib/headless/guillotine/queries/fragments/media');

const animatedIconsFragment = `
    ...on no_nav_navno_AnimatedIcons {
        data {
            icons {
                icon {
                    ${imageFragment}
                }
                transformStart
                transformEnd
                transformOrigin
            }
            lottieHover {
                ${mediaAttachmentFragment}
            }
            lottieActive {
                ${mediaAttachmentFragment}
            }
        }
    }
`;

module.exports = { fragment: animatedIconsFragment };
