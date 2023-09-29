import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import { findContentsWithText } from '../../../lib/utils/htmlarea-utils';
import { runInLocaleContext } from '../../../lib/localization/locale-context';
import { getLayersData } from '../../../lib/localization/layers-data';
import { getContentProjectIdFromRepoId } from '../../../lib/utils/repo-utils';
import { transformToCustomDependencyData } from '../../../lib/references/custom-dependencies-check';

const transformToResponseData = (contentArray: ReadonlyArray<Content>, locale: string) => {
    const repoId = getLayersData().localeToRepoIdMap[locale];

    return contentArray.map((content) =>
        transformToCustomDependencyData(content, getContentProjectIdFromRepoId(repoId))
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
    const { id, layer } = req.params;

    if (!id || !layer) {
        return {
            status: 400,
            body: {
                message: `Invalid parameters for fragment usage check (id: ${id} - layer: ${layer})`,
            },
        };
    }

    const [contentWithMacro, contentWithComponent] = runInLocaleContext(
        { locale: layer, branch: 'master', asAdmin: true },
        () => {
            return [findContentsWithFragmentMacro(id), findContentsWithFragmentComponent(id)];
        }
    );

    return {
        status: 200,
        body: {
            macros: transformToResponseData(contentWithMacro, layer),
            components: transformToResponseData(contentWithComponent, layer),
        },
    };
};
