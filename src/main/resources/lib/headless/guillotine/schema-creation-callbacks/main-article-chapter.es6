const contentLib = require('/lib/xp/content');
const graphQlLib = require('/lib/guillotine/graphql');
const { forceArray } = require('/lib/nav-utils');

const mainArticleChapterDataCallback = (context, params) => {
    params.fields.languages = {
        type: graphQlLib.list(graphQlLib.reference('Content')),
    };
};

// Finds and sets the corresponding chapters for the alternative language versions
// referred to by the chapter article
const mainArticleChapterCallback = (context, params) => {
    params.fields.data.resolve = (env) => {
        const { data, _path } = env.source;

        // Get the alternative language versions of the chapter article
        const article = contentLib.get({ key: data.article });
        const articleLanguageTargets = forceArray(article?.data?.languages)
            .map((target) => contentLib.get({ key: target }))
            .filter(Boolean);
        if (articleLanguageTargets.length === 0) {
            return data;
        }

        // Get the alternative language versions of the chapter parent
        const parentPath = _path.split('/').slice(0, -1).join('/');
        const parent = contentLib.get({ key: parentPath });
        const parentLanguageTargets = forceArray(parent?.data?.languages)
            .map((target) => contentLib.get({ key: target }))
            .filter(Boolean);
        if (parentLanguageTargets.length === 0) {
            return data;
        }

        const languages = articleLanguageTargets.reduce((languagesAcc, articleTarget) => {
            // Get the matching alternative language version of the chapter parent
            const parentAltLanguageTarget = parentLanguageTargets.filter(
                (parentTarget) => parentTarget.language === articleTarget.language
            )[0];
            if (!parentAltLanguageTarget) {
                return languagesAcc;
            }

            // Get all chapters for the alterative language
            const altLanguageChapters = contentLib
                .getChildren({
                    key: parentAltLanguageTarget._id,
                    count: 1000,
                })
                ?.hits?.filter((cTarget) => cTarget.type === 'no.nav.navno:main-article-chapter');
            if (!altLanguageChapters) {
                return languagesAcc;
            }

            // If there is a chapter whose article matches the one we're looking
            // for, add it to the languages list
            const chapterTarget = altLanguageChapters.filter(
                (cTarget) => cTarget.data.article === articleTarget._id
            )[0];
            if (!chapterTarget) {
                return languagesAcc;
            }

            return [...languagesAcc, chapterTarget];
        }, []);

        return { ...data, languages };
    };
};

module.exports = { mainArticleChapterDataCallback, mainArticleChapterCallback };
