const mediaUrlDownload = `
    mediaUrl(download:true, type:server)
`;

const mediaUrlInline = `
    mediaUrl(download:false, type:server)
`;

const mediaAttachmentFragment = `
    ...on media_Document {
        ${mediaUrlDownload}
    }
    ...on media_Image {
        ${mediaUrlDownload}
    }
    ...on media_Archive {
        ${mediaUrlDownload}
    }
    ...on media_Audio {
        ${mediaUrlDownload}
    }
    ...on media_Code {
        ${mediaUrlDownload}
    }
    ...on media_Data {
        ${mediaUrlDownload}
    }
    ...on media_Executable {
        ${mediaUrlDownload}
    }
    ...on media_Presentation {
        ${mediaUrlDownload}
    }
    ...on media_Spreadsheet {
        ${mediaUrlDownload}
    }
    ...on media_Text {
        ${mediaUrlDownload}
    }
    ...on media_Unknown {
        ${mediaUrlDownload}
    }
    ...on media_Vector {
        ${mediaUrlDownload}
    }
    ...on media_Video {
        ${mediaUrlDownload}
    }
`;

const imageFragment = `
    __typename
    ...on media_Vector {
        ${mediaUrlInline}
    }
    ...on media_Image {
        ${mediaUrlInline}
        imageUrl(scale:"$scale", type:server)
    }
`;

module.exports = {
    mediaAttachmentFragment,
    imageFragment,
};
