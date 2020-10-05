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
    }
`;

module.exports = componentsFragment;
