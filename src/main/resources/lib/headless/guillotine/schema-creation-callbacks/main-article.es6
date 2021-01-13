const validationLib = require('/lib/guillotine/util/validation');
const contentLib = require('/lib/xp/content');
const { htmlCleanUp } = require('./common/html-cleanup');

const mainArticleCallback = (context, params) => {

    // Resolve html-fields in data-object
    params.fields.data.resolve = (env) => {
        const data = env.source?.data;
        const text = data?.text ? htmlCleanUp(data.text) : '';
        const fact = data?.fact ? htmlCleanUp(data.fact) : '';
        return {
            ...data,
            text,
            fact
        }
    };

    // Resolve children
    params.fields.children.resolve = (env) => {
        validationLib.validateArguments(env.args);
        return contentLib
            .getChildren({
                key: env.source._id,
                start: env.args.offset,
                count: env.args.first,
                sort: env.args.sort,
            })
            .hits.filter((child) => {
                // filters out chapters which points to a non-existant (or unpublished) article
                if (child.type === 'no.nav.navno:main-article-chapter') {
                    return contentLib.exists({ key: child.data.article });
                }
                return true;
            });
    };
};

module.exports = mainArticleCallback;
