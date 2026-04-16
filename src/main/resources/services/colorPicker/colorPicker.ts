import { Request } from '@enonic-types/core';
import { sanitize } from '/lib/xp/common';

// Aksel v8 global color tokens (light mode)
// https://github.com/navikt/aksel/blob/main/%40navikt/core/tokens/src/tokens/colors/global.tokens.ts
const colorsByName: Record<string, string> = {
    AxNeutral000: '#ffffff',
    AxNeutral100: '#f5f6f7',
    AxNeutral100A: '#001a330a',
    AxNeutral200: '#ecedef',
    AxNeutral200A: '#000e2913',
    AxNeutral300: '#e1e3e7',
    AxNeutral300A: '#0011331e',
    AxNeutral400: '#cfd3d8',
    AxNeutral400A: '#00163030',
    AxNeutral500: '#818997',
    AxNeutral600: '#6f7785',
    AxNeutral700: '#5d6573',
    AxNeutral800: '#555d6a',
    AxNeutral900: '#49515e',
    AxNeutral1000: '#202733',
    AxAccent100: '#f1f7ff',
    AxAccent100A: '#006eff0e',
    AxAccent200: '#e4eeff',
    AxAccent200A: '#005fff1b',
    AxAccent300: '#d4e5fd',
    AxAccent300A: '#0165f42b',
    AxAccent400: '#bad5fb',
    AxAccent400A: '#0064f145',
    AxAccent500: '#428ae3',
    AxAccent600: '#2176d4',
    AxAccent700: '#0063c1',
    AxAccent800: '#005bb6',
    AxAccent900: '#004ea3',
    AxAccent1000: '#002459',
    AxSuccess100: '#e2fde8',
    AxSuccess100A: '#00ee351d',
    AxSuccess200: '#d5f6db',
    AxSuccess200A: '#00c9252a',
    AxSuccess300: '#c4edcd',
    AxSuccess300A: '#01b2273b',
    AxSuccess400: '#a8dfb4',
    AxSuccess400A: '#00a22457',
    AxSuccess500: '#199d4f',
    AxSuccess600: '#00893c',
    AxSuccess700: '#007629',
    AxSuccess800: '#006c1f',
    AxSuccess900: '#005e0f',
    AxSuccess1000: '#002e00',
    AxWarning100: '#fff5e4',
    AxWarning100A: '#ffa1001b',
    AxWarning200: '#ffebc7',
    AxWarning200A: '#ffa40038',
    AxWarning300: '#ffdea5',
    AxWarning300A: '#ffa2015a',
    AxWarning400: '#ffcb6f',
    AxWarning400A: '#ffa30090',
    AxWarning500: '#e75e01',
    AxWarning600: '#ca5000',
    AxWarning700: '#ac4400',
    AxWarning800: '#a03e00',
    AxWarning900: '#8c3500',
    AxWarning1000: '#481700',
    AxDanger100: '#fff2f7',
    AxDanger100A: '#ff00630d',
    AxDanger200: '#ffe8f0',
    AxDanger200A: '#ff005917',
    AxDanger300: '#ffd9e6',
    AxDanger300A: '#ff005826',
    AxDanger400: '#ffc2d7',
    AxDanger400A: '#ff00583d',
    AxDanger500: '#ec526e',
    AxDanger600: '#e22948',
    AxDanger700: '#cb0035',
    AxDanger800: '#bc002a',
    AxDanger900: '#a60017',
    AxDanger1000: '#560000',
    AxInfo100: '#eef6fc',
    AxInfo100A: '#0078d211',
    AxInfo200: '#e3eff7',
    AxInfo200A: '#006eb71c',
    AxInfo300: '#d7e6f0',
    AxInfo300A: '#0060a028',
    AxInfo400: '#c0d6e4',
    AxInfo400A: '#005a923f',
    AxInfo500: '#5a8fae',
    AxInfo600: '#457c9d',
    AxInfo700: '#246b91',
    AxInfo800: '#156389',
    AxInfo900: '#00557d',
    AxInfo1000: '#002942',
    AxBrandMagenta100: '#fbf3f6',
    AxBrandMagenta100A: '#aa00400c',
    AxBrandMagenta200: '#f8eaef',
    AxBrandMagenta200A: '#aa003d15',
    AxBrandMagenta300: '#f3dde5',
    AxBrandMagenta300A: '#a5003c22',
    AxBrandMagenta400: '#eccad6',
    AxBrandMagenta400A: '#a4003a35',
    AxBrandMagenta500: '#c26f92',
    AxBrandMagenta600: '#b65681',
    AxBrandMagenta700: '#a93d70',
    AxBrandMagenta800: '#a33069',
    AxBrandMagenta900: '#98185d',
    AxBrandMagenta1000: '#52002b',
    AxBrandBeige100: '#fff4ee',
    AxBrandBeige100A: '#ff5a0011',
    AxBrandBeige200: '#fdebe0',
    AxBrandBeige200A: '#ef5b001f',
    AxBrandBeige300: '#fcddcd',
    AxBrandBeige300A: '#f0520032',
    AxBrandBeige400: '#f8c8b1',
    AxBrandBeige400A: '#e94c004e',
    AxBrandBeige500: '#c0765d',
    AxBrandBeige600: '#ad634a',
    AxBrandBeige700: '#915541',
    AxBrandBeige800: '#874e3b',
    AxBrandBeige900: '#764332',
    AxBrandBeige1000: '#3c1f15',
    AxBrandBlue100: '#eef6fc',
    AxBrandBlue100A: '#0078d211',
    AxBrandBlue200: '#e3eff7',
    AxBrandBlue200A: '#006eb71c',
    AxBrandBlue300: '#d7e6f0',
    AxBrandBlue300A: '#0060a028',
    AxBrandBlue400: '#c0d6e4',
    AxBrandBlue400A: '#005a923f',
    AxBrandBlue500: '#5a8fae',
    AxBrandBlue600: '#457c9d',
    AxBrandBlue700: '#246b91',
    AxBrandBlue800: '#156389',
    AxBrandBlue900: '#00557d',
    AxBrandBlue1000: '#002942',
    AxMetaPurple100: '#f8f3ff',
    AxMetaPurple100A: '#6b00ff0c',
    AxMetaPurple200: '#f4ebff',
    AxMetaPurple200A: '#7300ff14',
    AxMetaPurple300: '#ebdefc',
    AxMetaPurple300A: '#6500e821',
    AxMetaPurple400: '#decbf7',
    AxMetaPurple400A: '#5e00d834',
    AxMetaPurple500: '#a271df',
    AxMetaPurple600: '#905bd3',
    AxMetaPurple700: '#7c4abf',
    AxMetaPurple800: '#7342b6',
    AxMetaPurple900: '#6535a7',
    AxMetaPurple1000: '#360072',
    AxMetaLime100: '#f4f9d1',
    AxMetaLime100A: '#c3de002e',
    AxMetaLime200: '#ebf4a9',
    AxMetaLime200A: '#c4df0056',
    AxMetaLime300: '#e1ea9a',
    AxMetaLime300A: '#b4ca0065',
    AxMetaLime400: '#cfda6c',
    AxMetaLime400A: '#acbf0093',
    AxMetaLime500: '#878f00',
    AxMetaLime600: '#757c00',
    AxMetaLime700: '#646900',
    AxMetaLime800: '#5c6100',
    AxMetaLime900: '#515400',
    AxMetaLime1000: '#2a2800',
    AxTextLogo: '#c30000',
    AxTransparent: '#ffffff00',
};

const colorsByCode = Object.entries(colorsByName).reduce(
    (acc, [colorName, colorCode]) => {
        const existingNames = acc[colorCode];

        return {
            ...acc,
            [colorCode]: existingNames ? `${existingNames}/${colorName}` : colorName,
        };
    },
    {} as Record<string, string>
);

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

export const get = (req: Request) => {
    const hits = getHits(req.params.query as string);

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
