const globalFragment = `
    __typename
    type
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
