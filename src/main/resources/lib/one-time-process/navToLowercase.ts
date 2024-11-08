import * as projectLib from '/lib/xp/project';
import * as nodeLib from '/lib/xp/node';

import { getRepoConnection } from '../../lib/repos/repo-utils';
import { RepoNode } from '/lib/xp/node';

import { logger } from '../../lib/utils/logging';
import { APP_DESCRIPTOR } from '../constants';
import { getLayersData } from '../localization/layers-data';

/** const contentTypesToInspect = [
    `${APP_DESCRIPTOR}:guide-page`,
    `${APP_DESCRIPTOR}:situation-page`,
    `${APP_DESCRIPTOR}:guide-page`,
    `${APP_DESCRIPTOR}:themed-article-page`,
    `${APP_DESCRIPTOR}:tools-page`,
    `${APP_DESCRIPTOR}:generic-page`,
    `${APP_DESCRIPTOR}:current-topic-page`,
    `${APP_DESCRIPTOR}:office-editorial-page`,
    `${APP_DESCRIPTOR}:form-intermediate-step`,
    `${APP_DESCRIPTOR}:product-details`,
    `${APP_DESCRIPTOR}:form-details`,
    `${APP_DESCRIPTOR}:content-page-with-sidemenus`,
]; **/
const contentTypesToInspect = [`${APP_DESCRIPTOR}:content-page-with-sidemenus`];

const branches = ['master', 'draft'];

const convertCaseForContentType = (contentType: string, repoId: string, branch: string) => {
    logger.info(`Converting case for content type ${contentType} in repo ${repoId}`);

    const repo = getRepoConnection({
        repoId,
        branch,
    });

    const query = `data.contentType = '${contentType}'`;
};

export const runNAVToLowercaseNav = () => {
    const layerData = getLayersData();
    const { defaultLocale, localeToRepoIdMap } = layerData;
    const layersAsArray = Object.entries(localeToRepoIdMap);

    contentTypesToInspect.forEach((contentType) => {
        layersAsArray.forEach(([locale, repoId]) => {
            branches.forEach((branch) => {
                convertCaseForContentType(contentType, repoId, branch);
            });
        });
    });
    logger.info('Finding "NAV" and replacing with "Nav"');
};
