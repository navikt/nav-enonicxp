import contentLib, { Content } from '/lib/xp/content';
import graphQlLib from '/lib/graphql';
import { forceArray } from '../../../utils/nav-utils';
import { CreationCallback } from '../../utils/creation-callback-utils';

type ContentTypeWithLanguages = Content & { data?: { languages?: string } };

export const mainArticleChapterDataCallback: CreationCallback = (context, params) => {
    params.fields.languages = {
        type: graphQlLib.list(graphQlLib.reference('Content')),
    };
};

// Finds and sets the corresponding chapters for the alternative language versions
// referred to by the chapter article
export const mainArticleChapterCallback: CreationCallback = (context, params) => {
    params.fields.data.args = {
        resolveLanguages: graphQlLib.GraphQLBoolean,
    };

    params.fields.data.resolve = (env) => {
        const { data, _path } = env.source;
        const { resolveLanguages } = env.args;

        if (!resolveLanguages) {
            return data;
        }

        // Get the alternative language versions of the chapter article
        const article = contentLib.get({ key: data.article }) as ContentTypeWithLanguages;

        const articleLanguageTargets = forceArray(article?.data?.languages)
            .map((target) => contentLib.get({ key: target }))
            .filter(Boolean) as Content[];
        if (articleLanguageTargets.length === 0) {
            return data;
        }

        // Get the alternative language versions of the chapter parent
        const parentPath = _path.split('/').slice(0, -1).join('/');
        const parent = contentLib.get({ key: parentPath }) as ContentTypeWithLanguages;
        const parentLanguageTargets = forceArray(parent?.data?.languages)
            .map((target) => contentLib.get({ key: target }))
            .filter(Boolean) as Content[];
        if (parentLanguageTargets.length === 0) {
            return data;
        }

        const languages = articleLanguageTargets.reduce((languagesAcc, articleTarget) => {
            // Get the matching alternative language version of the chapter parent
            const parentAltLanguageTarget = parentLanguageTargets.find(
                (parentTarget) => parentTarget.language === articleTarget.language
            );
            if (!parentAltLanguageTarget) {
                return languagesAcc;
            }

            // Get all chapters for the alterative language
            const altLanguageChapters = contentLib
                .getChildren({
                    key: parentAltLanguageTarget._id,
                    count: 1000,
                })
                ?.hits?.filter(
                    (cTarget) => cTarget.type === 'no.nav.navno:main-article-chapter'
                ) as Content<'no.nav.navno:main-article-chapter'>[];
            if (!altLanguageChapters) {
                return languagesAcc;
            }

            // If there is a chapter whose article matches the one we're looking
            // for, add it to the languages list
            const chapterTarget = altLanguageChapters.find(
                (cTarget) => cTarget.data.article === articleTarget._id
            );
            if (!chapterTarget) {
                return languagesAcc;
            }

            return [...languagesAcc, chapterTarget];
        }, [] as Content[]);

        return { ...data, languages };
    };
};
