const mediaUrlAttachment = `
    mediaUrl(download:true, type:absolute)
`;

const mediaUrlInline = `
    mediaUrl(download:false, type:absolute)
`;

const mediaDownloadFragment = `
    ...on media_Document {
        ${mediaUrlAttachment}
    }
    ...on media_Image {
        ${mediaUrlAttachment}
    }
    ...on media_Archive {
        ${mediaUrlAttachment}
    }
    ...on media_Audio {
        ${mediaUrlAttachment}
    }
    ...on media_Code {
        ${mediaUrlAttachment}
    }
    ...on media_Data {
        ${mediaUrlAttachment}
    }
    ...on media_Executable {
        ${mediaUrlAttachment}
    }
    ...on media_Presentation {
        ${mediaUrlAttachment}
    }
    ...on media_Spreadsheet {
        ${mediaUrlAttachment}
    }
    ...on media_Text {
        ${mediaUrlAttachment}
    }
    ...on media_Unknown {
        ${mediaUrlAttachment}
    }
    ...on media_Vector {
        ${mediaUrlAttachment}
    }
    ...on media_Video {
        ${mediaUrlAttachment}
    }
`;

const imageFragment = `
    __typename
    ...on media_Vector {
        ${mediaUrlInline}
    }
    ...on media_Image {
        ${mediaUrlInline}
        imageUrl(scale:"$scale", type:absolute)
    }
`;

module.exports = {
    mediaDownloadFragment,
    imageFragment,
};
