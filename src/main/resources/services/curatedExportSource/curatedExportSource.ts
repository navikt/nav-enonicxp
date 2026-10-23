import {
    getCuratedSource,
    postCuratedSourceBatch,
} from '../../lib/curated-export/source/source-requests';

// Serves local sandbox sources; deployed XP serves the same handlers through the webapp.
export const get = getCuratedSource;
export const post = postCuratedSourceBatch;
