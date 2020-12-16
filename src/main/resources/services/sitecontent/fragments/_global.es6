const globalFragment = `
    __typename
    _id
    _path
    createdTime
    modifiedTime
    displayName
    language
    publish {
        first
        from
    }
`;

module.exports = globalFragment;
