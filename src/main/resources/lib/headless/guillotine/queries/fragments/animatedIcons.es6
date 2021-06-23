const { imageFragment } = require('/lib/headless/guillotine/queries/fragments/media');

const codeFragment = `
    ...on media_Code {
        mediaText
    }
`;

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
                ${codeFragment}
            }
            lottieActive {
                ${codeFragment}
            }
        }
    }
`;

module.exports = { fragment: animatedIconsFragment };
