const { sanitize } = require('/lib/xp/common');

const createSectionHeaderId = (sectionWithHeader) => {
    return sanitize(sectionWithHeader.title);
};

// Create an anchorId based on the header-title if no anchorId exists
const sectionWithHeaderCallback = (context, params) => {
    params.fields.anchorId.resolve = (env) => {
        const { anchorId } = env.source;

        if (anchorId) {
            return anchorId;
        }

        return createSectionHeaderId(env.source);
    };
};

module.exports = { sectionWithHeaderCallback, createSectionHeaderId };
