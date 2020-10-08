const globalFragment = `
    __typename
    _id
    _path
    createdTime
    modifiedTime
    displayName
    pageAsJson
    pageTemplate {
        pageAsJson
    }
`;

module.exports = globalFragment;
