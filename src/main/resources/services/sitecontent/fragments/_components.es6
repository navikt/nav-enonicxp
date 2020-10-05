const componentsFragment = `
    components {
        type
        path
        image {
            image {
                imageUrl(scale:"$scale", type:absolute)
            }
        }
        part {
            descriptor
            configAsJson
        }
        text {
            value
        }
        fragment {
            id
            fragment {
                type
            }
        }
    }
`;

module.exports = componentsFragment;
