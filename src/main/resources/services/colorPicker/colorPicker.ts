import { sanitize } from '/lib/xp/common';

const toHex = (num: number) => {
    const hex = num.toString(16);
    if (hex.length === 1) {
        return `0${hex}`;
    }

    return hex;
};

// Converts rgba colors to hex-colors
// (for easy pasting of colors from the design system tokens, which are formatted like this :)
const rgba = (r: number, g: number, b: number, a: number) =>
    `#${toHex(r)}${toHex(g)}${toHex(b)}${a === 1 ? '' : toHex(a * 255)}`;

const colorsByName = {
    NavdsGlobalColorBlue50: rgba(230, 240, 255, 1),
    NavdsGlobalColorBlue100: rgba(204, 225, 255, 1),
    NavdsGlobalColorBlue200: rgba(153, 195, 255, 1),
    NavdsGlobalColorBlue300: rgba(102, 165, 244, 1),
    NavdsGlobalColorBlue400: rgba(51, 134, 224, 1),
    NavdsGlobalColorBlue500: rgba(0, 103, 197, 1),
    NavdsGlobalColorBlue600: rgba(0, 86, 180, 1),
    NavdsGlobalColorBlue700: rgba(0, 69, 156, 1),
    NavdsGlobalColorBlue800: rgba(0, 52, 125, 1),
    NavdsGlobalColorBlue900: rgba(0, 34, 82, 1),
    NavdsGlobalColorDeepblue50: rgba(230, 241, 248, 1),
    NavdsGlobalColorDeepblue100: rgba(204, 226, 240, 1),
    NavdsGlobalColorDeepblue200: rgba(153, 196, 221, 1),
    NavdsGlobalColorDeepblue300: rgba(102, 163, 196, 1),
    NavdsGlobalColorDeepblue400: rgba(51, 128, 165, 1),
    NavdsGlobalColorDeepblue500: rgba(0, 91, 130, 1),
    NavdsGlobalColorDeepblue600: rgba(0, 80, 119, 1),
    NavdsGlobalColorDeepblue700: rgba(0, 67, 103, 1),
    NavdsGlobalColorDeepblue800: rgba(0, 52, 83, 1),
    NavdsGlobalColorDeepblue900: rgba(0, 36, 58, 1),
    NavdsGlobalColorGray50: rgba(247, 247, 247, 1),
    NavdsGlobalColorGray100: rgba(241, 241, 241, 1),
    NavdsGlobalColorGray200: rgba(229, 229, 229, 1),
    NavdsGlobalColorGray300: rgba(207, 207, 207, 1),
    NavdsGlobalColorGray400: rgba(176, 176, 176, 1),
    NavdsGlobalColorGray500: rgba(143, 143, 143, 1),
    NavdsGlobalColorGray600: rgba(112, 112, 112, 1),
    NavdsGlobalColorGray700: rgba(89, 89, 89, 1),
    NavdsGlobalColorGray800: rgba(64, 64, 64, 1),
    NavdsGlobalColorGray900: rgba(38, 38, 38, 1),
    NavdsGlobalColorGreen50: rgba(243, 252, 245, 1),
    NavdsGlobalColorGreen100: rgba(204, 241, 214, 1),
    NavdsGlobalColorGreen200: rgba(153, 222, 173, 1),
    NavdsGlobalColorGreen300: rgba(102, 199, 134, 1),
    NavdsGlobalColorGreen400: rgba(51, 170, 95, 1),
    NavdsGlobalColorGreen500: rgba(6, 137, 58, 1),
    NavdsGlobalColorGreen600: rgba(0, 124, 46, 1),
    NavdsGlobalColorGreen700: rgba(0, 106, 35, 1),
    NavdsGlobalColorGreen800: rgba(0, 85, 25, 1),
    NavdsGlobalColorGreen900: rgba(0, 59, 15, 1),
    NavdsGlobalColorLightblue50: rgba(235, 252, 255, 1),
    NavdsGlobalColorLightblue100: rgba(216, 249, 255, 1),
    NavdsGlobalColorLightblue200: rgba(181, 241, 255, 1),
    NavdsGlobalColorLightblue300: rgba(151, 230, 255, 1),
    NavdsGlobalColorLightblue400: rgba(124, 218, 248, 1),
    NavdsGlobalColorLightblue500: rgba(102, 203, 236, 1),
    NavdsGlobalColorLightblue600: rgba(76, 173, 205, 1),
    NavdsGlobalColorLightblue700: rgba(54, 141, 168, 1),
    NavdsGlobalColorLightblue800: rgba(35, 107, 125, 1),
    NavdsGlobalColorLightblue900: rgba(19, 72, 82, 1),
    NavdsGlobalColorLimegreen50: rgba(253, 255, 230, 1),
    NavdsGlobalColorLimegreen100: rgba(249, 252, 204, 1),
    NavdsGlobalColorLimegreen200: rgba(236, 243, 153, 1),
    NavdsGlobalColorLimegreen300: rgba(217, 227, 102, 1),
    NavdsGlobalColorLimegreen400: rgba(193, 203, 51, 1),
    NavdsGlobalColorLimegreen500: rgba(162, 173, 0, 1),
    NavdsGlobalColorLimegreen600: rgba(147, 158, 0, 1),
    NavdsGlobalColorLimegreen700: rgba(127, 137, 0, 1),
    NavdsGlobalColorLimegreen800: rgba(102, 110, 0, 1),
    NavdsGlobalColorLimegreen900: rgba(71, 78, 0, 1),
    NavdsGlobalColorNavRed: rgba(195, 0, 0, 1),
    NavdsGlobalColorOrange50: rgba(255, 249, 240, 1),
    NavdsGlobalColorOrange100: rgba(255, 236, 204, 1),
    NavdsGlobalColorOrange200: rgba(255, 215, 153, 1),
    NavdsGlobalColorOrange300: rgba(255, 193, 102, 1),
    NavdsGlobalColorOrange400: rgba(255, 170, 51, 1),
    NavdsGlobalColorOrange500: rgba(255, 145, 0, 1),
    NavdsGlobalColorOrange600: rgba(212, 123, 0, 1),
    NavdsGlobalColorOrange700: rgba(168, 100, 0, 1),
    NavdsGlobalColorOrange800: rgba(125, 76, 0, 1),
    NavdsGlobalColorOrange900: rgba(82, 51, 0, 1),
    NavdsGlobalColorPurple50: rgba(239, 236, 244, 1),
    NavdsGlobalColorPurple100: rgba(224, 216, 233, 1),
    NavdsGlobalColorPurple200: rgba(192, 178, 210, 1),
    NavdsGlobalColorPurple300: rgba(161, 141, 187, 1),
    NavdsGlobalColorPurple400: rgba(130, 105, 162, 1),
    NavdsGlobalColorPurple500: rgba(99, 70, 137, 1),
    NavdsGlobalColorPurple600: rgba(82, 56, 116, 1),
    NavdsGlobalColorPurple700: rgba(65, 43, 93, 1),
    NavdsGlobalColorPurple800: rgba(48, 31, 70, 1),
    NavdsGlobalColorPurple900: rgba(31, 20, 47, 1),
    NavdsGlobalColorRed50: rgba(253, 232, 230, 1),
    NavdsGlobalColorRed100: rgba(249, 210, 204, 1),
    NavdsGlobalColorRed200: rgba(239, 168, 157, 1),
    NavdsGlobalColorRed300: rgba(225, 128, 113, 1),
    NavdsGlobalColorRed400: rgba(208, 92, 74, 1),
    NavdsGlobalColorRed500: rgba(186, 58, 38, 1),
    NavdsGlobalColorRed600: rgba(163, 42, 23, 1),
    NavdsGlobalColorRed700: rgba(136, 29, 12, 1),
    NavdsGlobalColorRed800: rgba(106, 18, 4, 1),
    NavdsGlobalColorRed900: rgba(72, 9, 0, 1),
    NavdsGlobalColorTransparent: rgba(255, 255, 255, 0),
    NavdsGlobalColorWhite: rgba(255, 255, 255, 1),
    NavdsSemanticColorBorderInverted: rgba(229, 229, 229, 1),
    NavdsSemanticColorBorderMuted: rgba(176, 176, 176, 1),
    NavdsSemanticColorBorder: rgba(112, 112, 112, 1),
    NavdsSemanticColorCanvasBackgroundInverted: rgba(38, 38, 38, 1),
    NavdsSemanticColorCanvasBackgroundLight: rgba(255, 255, 255, 1),
    NavdsSemanticColorCanvasBackground: rgba(241, 241, 241, 1),
    NavdsSemanticColorComponentBackgroundAlternate: rgba(247, 247, 247, 1),
    NavdsSemanticColorComponentBackgroundInverted: rgba(38, 38, 38, 1),
    NavdsSemanticColorComponentBackgroundLight: rgba(255, 255, 255, 1),
    NavdsSemanticColorDivider: rgba(229, 229, 229, 1),
    NavdsSemanticColorFeedbackDangerBackground: rgba(249, 210, 204, 1),
    NavdsSemanticColorFeedbackDangerBorder: rgba(186, 58, 38, 1),
    NavdsSemanticColorFeedbackDangerIcon: rgba(186, 58, 38, 1),
    NavdsSemanticColorFeedbackDangerText: rgba(186, 58, 38, 1),
    NavdsSemanticColorFeedbackInfoBackground: rgba(216, 249, 255, 1),
    NavdsSemanticColorFeedbackInfoBorder: rgba(54, 141, 168, 1),
    NavdsSemanticColorFeedbackInfoIcon: rgba(54, 141, 168, 1),
    NavdsSemanticColorFeedbackSuccessBackground: rgba(204, 241, 214, 1),
    NavdsSemanticColorFeedbackSuccessBorder: rgba(6, 137, 58, 1),
    NavdsSemanticColorFeedbackSuccessIcon: rgba(0, 124, 46, 1),
    NavdsSemanticColorFeedbackWarningBackground: rgba(255, 236, 204, 1),
    NavdsSemanticColorFeedbackWarningBorder: rgba(212, 123, 0, 1),
    NavdsSemanticColorFeedbackWarningIcon: rgba(255, 145, 0, 1),
    NavdsSemanticColorFocusInverted: rgba(153, 195, 255, 1),
    NavdsSemanticColorFocus: rgba(0, 52, 125, 1),
    NavdsSemanticColorInteractionDangerHover: rgba(163, 42, 23, 1),
    NavdsSemanticColorInteractionDangerSelected: rgba(136, 29, 12, 1),
    NavdsSemanticColorInteractionDanger: rgba(186, 58, 38, 1),
    NavdsSemanticColorInteractionPrimaryHoverSubtle: rgba(230, 240, 255, 1),
    NavdsSemanticColorInteractionPrimaryHover: rgba(0, 86, 180, 1),
    NavdsSemanticColorInteractionPrimarySelected: rgba(0, 91, 130, 1),
    NavdsSemanticColorInteractionPrimary: rgba(0, 103, 197, 1),
    NavdsSemanticColorLinkVisited: rgba(99, 70, 137, 1),
    NavdsSemanticColorLink: rgba(0, 103, 197, 1),
    NavdsSemanticColorTextInverted: rgba(255, 255, 255, 1),
    NavdsSemanticColorTextMuted: rgba(112, 112, 112, 1),
    NavdsSemanticColorText: rgba(38, 38, 38, 1),
};

const colorsByCode = Object.entries(colorsByName).reduce((acc, [colorName, colorCode]) => {
    const existingNames = acc[colorCode];

    return {
        ...acc,
        [colorCode]: existingNames ? `${existingNames}/${colorName}` : colorName,
    };
}, {} as Record<string, string>);

const generateIcon = (color: string) => `\
<svg width='32' height='32'>\
<circle r='16' cx='16' cy='16' fill='#444'/>\
<circle r='15' cx='16' cy='16' fill='${color}'/>\
</svg>\
`;

const colorCodePattern = new RegExp(
    '^#([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})$'
);

const generateHit = (colorCode: string, colorName: string) => ({
    id: colorCode,
    displayName: `${colorName} - ${colorCode}`,
    description: colorCode,
    icon: { data: generateIcon(colorCode), type: 'image/svg+xml' },
});

const allHits = Object.entries(colorsByCode).map(([colorCode, colorName]) =>
    generateHit(colorCode, colorName)
);

const getHits = (query?: string) => {
    if (!query) {
        return allHits;
    }

    const queryNormalized = sanitize(query);

    const filteredHits = allHits.filter(
        (hit) =>
            sanitize(hit.displayName).includes(queryNormalized) ||
            sanitize(hit.description).includes(queryNormalized)
    );

    const customColor =
        filteredHits.length === 0 &&
        colorCodePattern.test(query) &&
        generateHit(query, 'Egendefinert');

    return customColor ? [customColor] : filteredHits;
};

export const get = (req: XP.CustomSelectorServiceRequest) => {
    const hits = getHits(req.params.query);

    return {
        status: 200,
        contentType: 'application/json',
        body: {
            total: hits.length,
            count: hits.length,
            hits,
        },
    };
};
