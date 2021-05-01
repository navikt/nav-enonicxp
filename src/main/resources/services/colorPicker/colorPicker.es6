const colorCodePattern = new RegExp('^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$');

const colorsNameKeyed = {
    navBakgrunn: '#ffffff',
    navGraBakgrunn: '#f1f1f1',
    navRod: '#c30000',
    navOransje: '#ff9100',
    navLimeGronn: '#a2ad00',
    navGronn: '#06893a',
    navLilla: '#634689',
    navDypBla: '#005b82',
    navBla: '#0067c5',
    navLysBla: '#66cbec',
    navMorkGra: '#262626',
    navLysGra: '#f1f1f1',
    fokusFarge: '#254b6d',
    orangeFocus: '#ffbd66',
    redError: '#ba3a26',
    white: '#ffffff',
    navGra80: '#4f4f4f',
    navGra60: '#6a6a6a',
    navGra40: '#a0a0a0',
    navGra20: '#c9c9c9',
    grayBackground: '#f1f1f1',
    grayIcon: '#a0a0a0',
    grayModia: '#333333',
    grayInactive: '#6a6a6a',
    pinkErrorBg: '#f3e3e3',
    navGronnLighten20: '#38a161',
    navGronnLighten40: '#6ab889',
    navGronnLighten60: '#9bd0b0',
    navGronnLighten80: '#cde7d8',
    navGronnDarken20: '#117938',
    navGronnDarken40: '#1c6937',
    navGronnDarken60: '#285835',
    navGronnDarken80: '#334834',
    navLimeGronnLighten20: '#b5bd33',
    navLimeGronnLighten40: '#c7ce66',
    navLimeGronnLighten60: '#dade99',
    navLimeGronnLighten80: '#ecefcc',
    navLimeGronnDarken20: '#8e960a',
    navLimeGronnDarken40: '#7a7e14',
    navLimeGronnDarken60: '#66671e',
    navLimeGronnDarken80: '#524f28',
    navLysBlaLighten20: '#85d5f0',
    navLysBlaLighten40: '#a3e0f4',
    navLysBlaLighten60: '#c2eaf7',
    navLysBlaLighten80: '#e0f5fb',
    navLysBlaDarken20: '#5eaec7',
    navLysBlaDarken40: '#5690a2',
    navLysBlaDarken60: '#4e737c',
    navLysBlaDarken80: '#465557',
    navBlaLighten20: '#3385d1',
    navBlaLighten40: '#66a4dc',
    navBlaLighten60: '#99c2e8',
    navBlaLighten80: '#cce1f3',
    navBlaDarken20: '#0c5ea8',
    navBlaDarken40: '#19548a',
    navBlaDarken60: '#254b6d',
    navBlaDarken80: '#32414f',
    navDypBlaLighten20: '#337c9b',
    navDypBlaLighten40: '#669db4',
    navDypBlaLighten60: '#99bdcd',
    navDypBlaLighten80: '#ccdee6',
    navDypBlaDarken20: '#0c5472',
    navDypBlaDarken40: '#194d62',
    navDypBlaDarken60: '#254652',
    navDypBlaDarken80: '#323f42',
    navLillaLighten20: '#826ba1',
    navLillaLighten40: '#a190b8',
    navLillaLighten60: '#c1b5d0',
    navLillaLighten80: '#e0dae7',
    navLillaDarken20: '#5c4378',
    navLillaDarken40: '#544066',
    navLillaDarken60: '#4d3e55',
    navLillaDarken80: '#453b43',
    navRodLighten20: '#cf3333',
    navRodLighten40: '#db6666',
    navRodLighten60: '#e79999',
    navRodLighten80: '#f3cccc',
    navRodDarken20: '#a80b0a',
    navRodDarken40: '#8e1614',
    navRodDarken60: '#73221e',
    navRodDarken80: '#592d28',
    navOransjeLighten20: '#ffa733',
    navOransjeLighten40: '#ffbd66',
    navOransjeLighten60: '#ffd399',
    navOransjeLighten80: '#ffe9cc',
    navOransjeDarken20: '#d87f0a',
    navOransjeDarken40: '#b26d14',
    navOransjeDarken60: '#8b5c1e',
    navOransjeDarken80: '#654a28',
    orangeFocusLighten20: '#ffca85',
    orangeFocusLighten40: '#ffd7a3',
    orangeFocusLighten60: '#ffe5c2',
    orangeFocusLighten80: '#fff2e0',
    orangeFocusDarken20: '#d8a25c',
    orangeFocusDarken40: '#b28851',
    orangeFocusDarken60: '#8b6d47',
    orangeFocusDarken80: '#65533c',
    redErrorLighten20: '#c86151',
    redErrorLighten40: '#d6897d',
    redErrorLighten60: '#e3b0a8',
    redErrorLighten80: '#f1d8d4',
    redErrorDarken20: '#a13a28',
    redErrorDarken40: '#88392b',
    redErrorDarken60: '#70392d',
    redErrorDarken80: '#573830',
};

const colorsCodeKeyed = Object.entries(colorsNameKeyed).reduce((acc, [colorName, colorCode]) => {
    const existingNames = acc[colorCode];

    return {
        ...acc,
        [colorCode]: existingNames ? `${existingNames}/${colorName}` : colorName,
    };
}, {});

const generateIcon = (color) => `
    <svg width="32" height="32">
        <circle r="16" cx="16" cy="16" fill="#555"/>
        <circle r="15" cx="16" cy="16" fill="${color}"/>
    </svg>
`;

const generateHit = (colorCode, colorName) =>
    colorCodePattern.test(colorCode) && {
        id: colorCode,
        displayName: `${colorName} - ${colorCode}`,
        description: ' ',
        icon: { data: generateIcon(colorCode), type: 'image/svg+xml' },
    };

const generateHits = (query) => {
    const dsColors = Object.entries(colorsCodeKeyed).map(([colorCode, colorName]) =>
        generateHit(colorCode, colorName)
    );

    const customColor =
        !dsColors.some((color) => color.id === query) && generateHit(query, 'Egendefinert');

    return [...dsColors, ...(customColor ? [customColor] : [])];
};

const colorPicker = (req) => {
    const { params } = req;
    const hits = generateHits(params.query);

    return {
        status: 200,
        body: {
            total: hits.length,
            count: hits.length,
            hits,
        },
    };
};

exports.get = colorPicker;
