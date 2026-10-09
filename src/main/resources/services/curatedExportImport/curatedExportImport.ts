import {
    getCuratedImportStatus,
    postCuratedImportAction,
} from '../../lib/curated-export/target/import-requests';

export const get = getCuratedImportStatus;
export const post = postCuratedImportAction;
