import { Content } from '/lib/xp/content';
import { RepoBranch } from '../../../types/common';
import { runInLocaleContext } from '../../../lib/localization/locale-context';
import { runSitecontentGuillotineQuery } from '../../../lib/guillotine/queries/run-sitecontent-query';
import { getModifiedTimeIncludingFragments } from '../../../lib/utils/fragment-utils';
import { getLanguageVersions } from '../../../lib/localization/resolve-language-versions';
import { replaceNAVwithNav } from '../../../lib/utils/string-utils';

// Ensure something vaguely sane is returned from the service :)
// TODO: Replace this after we get our Guillotine response better typed
export type SitecontentResponse =
    | (Pick<Content, '_id' | '_path' | 'displayName'> & Record<string, any>)
    | null;

// Resolve the base content to a fully resolved content via a guillotine query
export const sitecontentContentResponse = ({
    baseContent,
    branch,
    locale,
}: {
    baseContent: Content;
    branch: RepoBranch;
    locale: string;
}): SitecontentResponse =>
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
            const start = Date.now();
            const replacedResult = replaceNAVwithNav(queryResult);
            const end = Date.now();

            log.info(
                `NAVREPLACEMENT ${baseContent.data.customPath}: Time to replace NAV with Nav: ${end - start}ms`
            );

            return replacedResult;
        }
    );
