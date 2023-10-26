import { Content } from '/lib/xp/content';
import { RepoBranch } from '../../types/common';
import { runInLocaleContext } from '../../lib/localization/locale-context';
import { runSitecontentGuillotineQuery } from '../../lib/guillotine/queries/run-sitecontent-query';
import { getModifiedTimeIncludingFragments } from '../../lib/utils/fragment-utils';
import { getLanguageVersions } from '../../lib/localization/resolve-language-versions';

// Resolve the base content to a fully resolved content via a guillotine query
export const sitecontentResolveContent = ({
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

            return queryResult
                ? {
                      ...queryResult,
                      // modifiedTime should also take any fragments on the page into account
                      modifiedTime: getModifiedTimeIncludingFragments(baseContent, branch),
                      languages: getLanguageVersions({
                          baseContent,
                          branch,
                          baseContentLocale: locale,
                      }),
                      contentLayer: locale,
                  }
                : null;
        }
    );
