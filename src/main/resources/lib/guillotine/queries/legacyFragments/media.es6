const mediaUrlInline = `
    mediaUrl(download:false, type:server)
`;

const imageFragment = `
    __typename
    type
    ...on media_Vector {
        ${mediaUrlInline}
    }
    ...on media_Image {
        ${mediaUrlInline}
        imageUrl(scale:"$scale", type:server)
        imageInfo {
            imageWidth
            imageHeight
            contentType
        }
    }
`;

module.exports = {
    imageFragment,
};
