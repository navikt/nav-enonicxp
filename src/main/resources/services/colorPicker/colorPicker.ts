import { Request } from '@enonic-types/core';
import { sanitize } from '/lib/xp/common';

// Aksel v8 global color tokens (light mode)
const colorsByName: Record<string, string> = {
    '--ax-neutral-000': '#ffffff',
    '--ax-neutral-100': '#f5f6f7',
    '--ax-neutral-100A': '#001a330a',
    '--ax-neutral-200': '#ecedef',
    '--ax-neutral-200A': '#000e2913',
    '--ax-neutral-300': '#e1e3e7',
    '--ax-neutral-300A': '#0011331e',
    '--ax-neutral-400': '#cfd3d8',
    '--ax-neutral-400A': '#00163030',
    '--ax-neutral-500': '#818997',
    '--ax-neutral-600': '#6f7785',
    '--ax-neutral-700': '#5d6573',
    '--ax-neutral-800': '#555d6a',
    '--ax-neutral-900': '#49515e',
    '--ax-neutral-1000': '#202733',
    '--ax-accent-100': '#f1f7ff',
    '--ax-accent-100A': '#006eff0e',
    '--ax-accent-200': '#e4eeff',
    '--ax-accent-200A': '#005fff1b',
    '--ax-accent-300': '#d4e5fd',
    '--ax-accent-300A': '#0165f42b',
    '--ax-accent-400': '#bad5fb',
    '--ax-accent-400A': '#0064f145',
    '--ax-accent-500': '#428ae3',
    '--ax-accent-600': '#2176d4',
    '--ax-accent-700': '#0063c1',
    '--ax-accent-800': '#005bb6',
    '--ax-accent-900': '#004ea3',
    '--ax-accent-1000': '#002459',
    '--ax-success-100': '#e2fde8',
    '--ax-success-100A': '#00ee351d',
    '--ax-success-200': '#d5f6db',
    '--ax-success-200A': '#00c9252a',
    '--ax-success-300': '#c4edcd',
    '--ax-success-300A': '#01b2273b',
    '--ax-success-400': '#a8dfb4',
    '--ax-success-400A': '#00a22457',
    '--ax-success-500': '#199d4f',
    '--ax-success-600': '#00893c',
    '--ax-success-700': '#007629',
    '--ax-success-800': '#006c1f',
    '--ax-success-900': '#005e0f',
    '--ax-success-1000': '#002e00',
    '--ax-warning-100': '#fff5e4',
    '--ax-warning-100A': '#ffa1001b',
    '--ax-warning-200': '#ffebc7',
    '--ax-warning-200A': '#ffa40038',
    '--ax-warning-300': '#ffdea5',
    '--ax-warning-300A': '#ffa2015a',
    '--ax-warning-400': '#ffcb6f',
    '--ax-warning-400A': '#ffa30090',
    '--ax-warning-500': '#e75e01',
    '--ax-warning-600': '#ca5000',
    '--ax-warning-700': '#ac4400',
    '--ax-warning-800': '#a03e00',
    '--ax-warning-900': '#8c3500',
    '--ax-warning-1000': '#481700',
    '--ax-danger-100': '#fff2f7',
    '--ax-danger-100A': '#ff00630d',
    '--ax-danger-200': '#ffe8f0',
    '--ax-danger-200A': '#ff005917',
    '--ax-danger-300': '#ffd9e6',
    '--ax-danger-300A': '#ff005826',
    '--ax-danger-400': '#ffc2d7',
    '--ax-danger-400A': '#ff00583d',
    '--ax-danger-500': '#ec526e',
    '--ax-danger-600': '#e22948',
    '--ax-danger-700': '#cb0035',
    '--ax-danger-800': '#bc002a',
    '--ax-danger-900': '#a60017',
    '--ax-danger-1000': '#560000',
    '--ax-info-100': '#eef6fc',
    '--ax-info-100A': '#0078d211',
    '--ax-info-200': '#e3eff7',
    '--ax-info-200A': '#006eb71c',
    '--ax-info-300': '#d7e6f0',
    '--ax-info-300A': '#0060a028',
    '--ax-info-400': '#c0d6e4',
    '--ax-info-400A': '#005a923f',
    '--ax-info-500': '#5a8fae',
    '--ax-info-600': '#457c9d',
    '--ax-info-700': '#246b91',
    '--ax-info-800': '#156389',
    '--ax-info-900': '#00557d',
    '--ax-info-1000': '#002942',
    '--ax-brand-magenta-100': '#fbf3f6',
    '--ax-brand-magenta-100A': '#aa00400c',
    '--ax-brand-magenta-200': '#f8eaef',
    '--ax-brand-magenta-200A': '#aa003d15',
    '--ax-brand-magenta-300': '#f3dde5',
    '--ax-brand-magenta-300A': '#a5003c22',
    '--ax-brand-magenta-400': '#eccad6',
    '--ax-brand-magenta-400A': '#a4003a35',
    '--ax-brand-magenta-500': '#c26f92',
    '--ax-brand-magenta-600': '#b65681',
    '--ax-brand-magenta-700': '#a93d70',
    '--ax-brand-magenta-800': '#a33069',
    '--ax-brand-magenta-900': '#98185d',
    '--ax-brand-magenta-1000': '#52002b',
    '--ax-brand-beige-100': '#fff4ee',
    '--ax-brand-beige-100A': '#ff5a0011',
    '--ax-brand-beige-200': '#fdebe0',
    '--ax-brand-beige-200A': '#ef5b001f',
    '--ax-brand-beige-300': '#fcddcd',
    '--ax-brand-beige-300A': '#f0520032',
    '--ax-brand-beige-400': '#f8c8b1',
    '--ax-brand-beige-400A': '#e94c004e',
    '--ax-brand-beige-500': '#c0765d',
    '--ax-brand-beige-600': '#ad634a',
    '--ax-brand-beige-700': '#915541',
    '--ax-brand-beige-800': '#874e3b',
    '--ax-brand-beige-900': '#764332',
    '--ax-brand-beige-1000': '#3c1f15',
    '--ax-brand-blue-100': '#eef6fc',
    '--ax-brand-blue-100A': '#0078d211',
    '--ax-brand-blue-200': '#e3eff7',
    '--ax-brand-blue-200A': '#006eb71c',
    '--ax-brand-blue-300': '#d7e6f0',
    '--ax-brand-blue-300A': '#0060a028',
    '--ax-brand-blue-400': '#c0d6e4',
    '--ax-brand-blue-400A': '#005a923f',
    '--ax-brand-blue-500': '#5a8fae',
    '--ax-brand-blue-600': '#457c9d',
    '--ax-brand-blue-700': '#246b91',
    '--ax-brand-blue-800': '#156389',
    '--ax-brand-blue-900': '#00557d',
    '--ax-brand-blue-1000': '#002942',
    '--ax-meta-purple-100': '#f8f3ff',
    '--ax-meta-purple-100A': '#6b00ff0c',
    '--ax-meta-purple-200': '#f4ebff',
    '--ax-meta-purple-200A': '#7300ff14',
    '--ax-meta-purple-300': '#ebdefc',
    '--ax-meta-purple-300A': '#6500e821',
    '--ax-meta-purple-400': '#decbf7',
    '--ax-meta-purple-400A': '#5e00d834',
    '--ax-meta-purple-500': '#a271df',
    '--ax-meta-purple-600': '#905bd3',
    '--ax-meta-purple-700': '#7c4abf',
    '--ax-meta-purple-800': '#7342b6',
    '--ax-meta-purple-900': '#6535a7',
    '--ax-meta-purple-1000': '#360072',
    '--ax-meta-lime-100': '#f4f9d1',
    '--ax-meta-lime-100A': '#c3de002e',
    '--ax-meta-lime-200': '#ebf4a9',
    '--ax-meta-lime-200A': '#c4df0056',
    '--ax-meta-lime-300': '#e1ea9a',
    '--ax-meta-lime-300A': '#b4ca0065',
    '--ax-meta-lime-400': '#cfda6c',
    '--ax-meta-lime-400A': '#acbf0093',
    '--ax-meta-lime-500': '#878f00',
    '--ax-meta-lime-600': '#757c00',
    '--ax-meta-lime-700': '#646900',
    '--ax-meta-lime-800': '#5c6100',
    '--ax-meta-lime-900': '#515400',
    '--ax-meta-lime-1000': '#2a2800',
    '--ax-text-logo': '#c30000',
    '--ax-transparent': '#ffffff00',
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
