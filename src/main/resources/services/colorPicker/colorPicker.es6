const colorsByName = {
    navRod: '#c30000',
    navOransje: '#ff9100',
    navLimeGronn: '#a2ad00',
    navGronn: '#06893a',
    navLilla: '#634689',
    navDypBla: '#005b82',
    navBla: '#0067c5',
    navLysBla: '#66cbec',
    navMorkGra: '#262626',
    navGra80: '#4f4f4f',
    navGra60: '#6a6a6a',
    navGra40: '#a0a0a0',
    navGra20: '#c9c9c9',
    navLysGra: '#f1f1f1',
    navBakgrunn: '#ffffff',
    navGraBakgrunn: '#f1f1f1',
    fokusFarge: '#00347d',
    redError: '#ba3a26',
    white: '#fff',
    grayIcon: '#a0a0a0',
    grayModia: '#333333',
    grayInactive: '#6a6a6a',
    pinkErrorBg: '#f3e3e3',
    navGronnLighten80: '#ccf1d6',
    navGronnLighten60: '#99dead',
    navGronnLighten40: '#66c786',
    navGronnLighten20: '#33aa5f',
    navGronnDarken20: '#007c2e',
    navGronnDarken40: '#006a23',
    navGronnDarken60: '#005519',
    navGronnDarken80: '#003b0f',
    navLimeGronnLighten80: '#f9fccc',
    navLimeGronnLighten60: '#ecf399',
    navLimeGronnLighten40: '#d9e366',
    navLimeGronnLighten20: '#c1cb33',
    navLimeGronnDarken20: '#939e00',
    navLimeGronnDarken40: '#7f8900',
    navLimeGronnDarken60: '#666e00',
    navLimeGronnDarken80: '#474e00',
    navLysBlaLighten80: '#d8f9ff',
    navLysBlaLighten60: '#b5f1ff',
    navLysBlaLighten40: '#97e6ff',
    navLysBlaLighten20: '#7cdaf8',
    navLysBlaDarken20: '#4cadcd',
    navLysBlaDarken40: '#368da8',
    navLysBlaDarken60: '#236b7d',
    navLysBlaDarken80: '#134852',
    navBlaLighten80: '#cce1ff',
    navBlaLighten60: '#99c3ff',
    navBlaLighten40: '#66a5f4',
    navBlaLighten20: '#3386e0',
    navBlaDarken20: '#0056b4',
    navBlaDarken40: '#00459c',
    navBlaDarken60: '#00347d',
    navBlaDarken80: '#002252',
    navDypBlaLighten80: '#cce2f0',
    navDypBlaLighten60: '#99c4dd',
    navDypBlaLighten40: '#66a3c4',
    navDypBlaLighten20: '#3380a5',
    navDypBlaDarken20: '#005077',
    navDypBlaDarken40: '#004367',
    navDypBlaDarken60: '#003453',
    navDypBlaDarken80: '#00243a',
    navLillaLighten80: '#e0d8e9',
    navLillaLighten60: '#c0b2d2',
    navLillaLighten40: '#a18dbb',
    navLillaLighten20: '#8269a2',
    navLillaDarken20: '#523874',
    navLillaDarken40: '#412b5d',
    navLillaDarken60: '#301f46',
    navLillaDarken80: '#1f142f',
    redErrorLighten80: '#f9d2cc',
    redErrorLighten60: '#efa89d',
    redErrorLighten40: '#e18071',
    redErrorLighten20: '#d05c4a',
    redErrorDarken20: '#a32a17',
    redErrorDarken40: '#881d0c',
    redErrorDarken60: '#6a1204',
    redErrorDarken80: '#480900',
    navOransjeLighten80: '#ffeccc',
    navOransjeLighten60: '#ffd799',
    navOransjeLighten40: '#ffc166',
    navOransjeLighten20: '#ffaa33',
    navOransjeDarken20: '#d47b00',
    navOransjeDarken40: '#a86400',
    navOransjeDarken60: '#7d4c00',
    navOransjeDarken80: '#523300',
};

const colorsByCode = Object.entries(colorsByName).reduce((acc, [colorName, colorCode]) => {
    const existingNames = acc[colorCode];

    return {
        ...acc,
        [colorCode]: existingNames ? `${existingNames}/${colorName}` : colorName,
    };
}, {});

const generateIcon = (color) => `\
<svg width="32" height="32">\
<circle r="16" cx="16" cy="16" fill="#444"/>\
<circle r="15" cx="16" cy="16" fill="${color}"/>\
</svg>\
`;

const colorCodePattern = new RegExp('^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$');

const generateHit = (colorCode, colorName) => ({
    id: colorCode,
    displayName: `${colorName} - ${colorCode}`,
    description: colorCode,
    icon: { data: generateIcon(colorCode), type: 'image/svg+xml' },
});

const colorHits = Object.entries(colorsByCode).map(([colorCode, colorName]) =>
    generateHit(colorCode, colorName)
);

const normalizeString = (str) => str.replace(/ø/g, 'o').replace(/å/g, 'a').toLowerCase();

const getHits = (query) => {
    if (!query) {
        return colorHits;
    }

    const queryNormalized = normalizeString(query);

    const filteredHits = colorHits.filter(
        (hit) =>
            normalizeString(hit.displayName).includes(queryNormalized) ||
            normalizeString(hit.description).includes(queryNormalized)
    );

    const customColor =
        filteredHits.length === 0 &&
        colorCodePattern.test(query) &&
        generateHit(query, 'Egendefinert');

    return customColor ? [customColor] : colorHits;
};

const colorPicker = (req) => {
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

exports.get = colorPicker;
