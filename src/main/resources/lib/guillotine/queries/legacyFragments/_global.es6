const globalFragment = `
    __typename
    _id
    _path
    type
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
