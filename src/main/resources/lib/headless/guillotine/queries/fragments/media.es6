const globalFragment = require('./_global');

const mediaContentFragment = `
    mediaUrl(download:false, type:server)
`;

const mediaFragment = `
    ${globalFragment}
    ...on media_Document {
        ${mediaContentFragment}
    }
    ...on media_Image {
        ${mediaContentFragment}
    }
    ...on media_Archive {
        ${mediaContentFragment}
    }
    ...on media_Audio {
        ${mediaContentFragment}
    }
    ...on media_Code {
        ${mediaContentFragment}
    }
    ...on media_Data {
        ${mediaContentFragment}
    }
    ...on media_Executable {
        ${mediaContentFragment}
    }
    ...on media_Presentation {
        ${mediaContentFragment}
    }
    ...on media_Spreadsheet {
        ${mediaContentFragment}
    }
    ...on media_Text {
        ${mediaContentFragment}
    }
    ...on media_Unknown {
        ${mediaContentFragment}
    }
    ...on media_Vector {
        ${mediaContentFragment}
    }
    ...on media_Video {
        ${mediaContentFragment}
    }
`;

const imageMediaFragment = `
    __typename
    ...on media_Vector {
        ${mediaContentFragment}
    }
    ...on media_Image {
        ${mediaContentFragment}
        imageUrl(scale:"$scale", type:server)
    }
`;

module.exports = {
    fragment: mediaFragment,
    imageFragment: imageMediaFragment,
};
