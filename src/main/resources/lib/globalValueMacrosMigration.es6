const nodeLib = require('/lib/xp/node');
const contentLib = require('/lib/xp/content');
const { runInBranchContext } = require('/lib/headless/branch-context');

const getPagesWithLegacyMacros = () => {
    return runInBranchContext(
        () =>
            contentLib.query({
                start: 0,
                count: 1000,
                contentTypes: [
                    'no.nav.navno:main-article',
                    'no.nav.navno:content-page-with-sidemenus',
                    'no.nav.navno:situation-page',
                    'portal:fragment',
                ],
                query:
                    "fulltext('data.text, data.fact, components.part.config.no-nav-navno.html-area.html', '[global-value key=\"gv_', 'AND') OR fulltext('data.text, data.fact, components.part.config.no-nav-navno.html-area.html', '[global-value-with-math keys=\"gv_', 'AND')",
            }),
        'draft'
    ).hits;
};

const updateLegacyMacros = (htmlString) => {
    return htmlString
        .replace(/\[global-value key="gv_.+::.+]/g, (match) => {
            log.info(`regex match: ${match}`);
            const contentId = match.split('::')[1]?.split(' ')[0];
            return `[global-value key="${contentId}"/]`;
        })
        .replace(/\[global-value-with-math keys="gv_.+::.+]/g, (match) => {
            log.info(`regex match: ${match}`);
            const contentId = match.split('::')[1]?.split(' ')[0];
            return `[global-value-with-math keys="${contentId}"/]`;
        });
};

const updateMainArticle = (repo, content) => {
    const text = content?.data?.text;

    if (!text) {
        return;
    }

    const updatedText = updateLegacyMacros(text);
    log.info(`New text: ${updatedText}`);
};

const updateDynamicType = (repo, content) => {};

const globalValueMacrosMigration = () => {
    const repo = nodeLib.connect({
        repoId: 'com.enonic.cms.default',
        branch: 'draft',
        principals: ['role:system.admin'],
    });

    const contents = getPagesWithLegacyMacros();
    log.info(`Found ${contents.length} pages with macros`);

    contents.forEach((content) => {
        if (content.type === 'no.nav.navno:main-article') {
            updateMainArticle(repo, content);
        } else {
            updateDynamicType(repo, content);
        }
    });
};

module.exports = { globalValueMacrosMigration };
