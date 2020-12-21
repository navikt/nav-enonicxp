const validationLib = require('/lib/guillotine/util/validation');
const contentLib = require('/lib/xp/content');

const mainArticleCallback = (context, params) => {
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
                    const exists = contentLib.exists({ key: child.data.article });
                    if (!exists) {
                        log.error(
                            `${child.data.article} - got a hit for a chapter which doesn't exist`
                        );
                    }
                    return exists;
                }
                return true;
            });
    };
};

module.exports = mainArticleCallback;
