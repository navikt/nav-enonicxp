import { Content } from '/lib/xp/content';
import { RepoBranch } from '../../../types/common';
import { runInLocaleContext } from '../../../lib/localization/locale-context';
import { runSitecontentGuillotineQuery } from '../../../lib/guillotine/queries/run-sitecontent-query';
import { getModifiedTimeIncludingFragments } from '../../../lib/utils/fragment-utils';
import { getLanguageVersions } from '../../../lib/localization/resolve-language-versions';

// Resolve the base content to a fully resolved content via a guillotine query
export const sitecontentContentResponse = ({
    baseContent,
    branch,
    locale,
}: {
    baseContent: Content;
    branch: RepoBranch;
    locale: string;
}): Content | null =>
    runInLocaleContext(
        {
            locale: baseContent.language,
            attributes: {
                baseContentId: baseContent._id,
            },
        },
        () => {
            const queryResult = runSitecontentGuillotineQuery(baseContent, branch);
            if (!queryResult) {
                return null;
            }

            queryResult.modifiedTime = getModifiedTimeIncludingFragments(baseContent, branch);
            queryResult.languages = getLanguageVersions({
                baseContent,
                branch,
                baseContentLocale: locale,
            });
            queryResult.contentLayer = locale;

            return queryResult;
        }
    );
