import { getRepoConnection } from '../utils/repo-utils';
import { SEARCH_REPO_ID } from '../constants';

export const generateSearchDocumentId = (contentId: string, locale: string) =>
    `${contentId}-${locale}`;

export const SEARCH_REPO_CONFIG_NODE = 'externalConfig';

export const getSearchRepoConnection = () =>
    getRepoConnection({
        repoId: SEARCH_REPO_ID,
        branch: 'master',
        asAdmin: true,
    });
