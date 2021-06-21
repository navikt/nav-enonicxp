const { imageFragment } = require('/lib/headless/guillotine/queries/fragments/media');

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
            lottieHover
            lottieActive
        }
    }
`;

module.exports = { fragment: animatedIconsFragment };
