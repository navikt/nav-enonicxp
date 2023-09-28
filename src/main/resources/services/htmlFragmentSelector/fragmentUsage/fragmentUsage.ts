import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import { findContentsWithText } from '../../../lib/utils/htmlarea-utils';
import { transformUsageHit } from '../../service-utils';
import { runInLocaleContext } from '../../../lib/localization/locale-context';
import { getLayersData } from '../../../lib/localization/layers-data';
import { getContentProjectIdFromRepoId } from '../../../lib/utils/repo-utils';

const transformContentToResponseData = (contentArray: ReadonlyArray<Content>, locale: string) => {
    const repoId = getLayersData().localeToRepoIdMap[locale];

    return contentArray.map((content) =>
        transformUsageHit(content, getContentProjectIdFromRepoId(repoId))
    );
};

const findContentsWithFragmentComponent = (fragmentId: string) => {
    return contentLib.query({
        start: 0,
        count: 1000,
        filters: {
            boolean: {
                must: {
                    hasValue: {
                        field: 'components.fragment.id',
                        values: [fragmentId],
                    },
                },
            },
        },
    }).hits;
};

const findContentsWithFragmentMacro = (fragmentId: string) => {
    return findContentsWithText(`html-fragment fragmentId=\\"${fragmentId}\\"`);
};

export const getFragmentUsageService = (req: XP.CustomSelectorServiceRequest) => {
    const { fragmentId, locale } = req.params;

    if (!fragmentId || !locale) {
        return {
            status: 400,
            body: {
                message: `Invalid parameters for fragment usage check (${fragmentId} - ${locale})`,
            },
        };
    }

    const [contentWithMacro, contentWithComponent] = runInLocaleContext(
        { locale, branch: 'master', asAdmin: true },
        () => {
            return [
                findContentsWithFragmentMacro(fragmentId),
                findContentsWithFragmentComponent(fragmentId),
            ];
        }
    );

    return {
        status: 200,
        body: {
            macroUsage: transformContentToResponseData(contentWithMacro, locale),
            componentUsage: transformContentToResponseData(contentWithComponent, locale),
        },
    };
};
