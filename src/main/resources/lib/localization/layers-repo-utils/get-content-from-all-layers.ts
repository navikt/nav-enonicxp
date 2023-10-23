import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import { RepoBranch } from '../../../types/common';
import { insertLocalizationStateFilter, LocalizationState } from './localization-state-filters';
import { getLayersData } from '../layers-data';
import { logger } from '../../utils/logging';
import { runInLocaleContext } from '../locale-context';
import { getLayersMultiConnection } from './layers-repo-connection';

type ContentAndLayerData = {
    content: Content;
    locale: string;
    repoId: string;
};

type Args = {
    contentId: string;
    branch: RepoBranch;
    state: LocalizationState;
};

export const getContentFromAllLayers = ({
    contentId,
    branch,
    state,
}: Args): ContentAndLayerData[] => {
    const localizedNodes = getLayersMultiConnection(branch).query(
        insertLocalizationStateFilter(
            {
                start: 0,
                count: 100,
                filters: {
                    ids: {
                        values: [contentId],
                    },
                },
            },
            state
        )
    ).hits;

    const { repoIdToLocaleMap } = getLayersData();

    return localizedNodes.reduce<ContentAndLayerData[]>((acc, node) => {
        const { repoId, id } = node;

        const locale = repoIdToLocaleMap[repoId];
        if (!locale) {
            logger.critical(`No locale found for repoId ${repoId}`);
            return acc;
        }

        const content = runInLocaleContext({ branch, locale }, () => contentLib.get({ key: id }));
        if (!content) {
            logger.warning(`Content not found: ${id} in repo ${repoId} in branch ${branch}`);
            return acc;
        }

        return [...acc, { content, locale, repoId }];
    }, []);
};
