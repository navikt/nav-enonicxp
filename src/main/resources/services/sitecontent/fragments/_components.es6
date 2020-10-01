const componentsFragment = `
    components {
        type
        path
        image {
            image {
                imageUrl(scale:"$scale", type:absolute)
            }
        }
    }
`;

module.exports = componentsFragment;
