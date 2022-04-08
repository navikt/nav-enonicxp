const contentList = require('../contentList');

// This fragment can cause circular references/stack overflow if imported
// into one of the ContentList sectionContents fragments.
const contentListMixinFragment = `
    target {
        ${contentList.fragment}
    }
`;

module.exports = contentListMixinFragment;
