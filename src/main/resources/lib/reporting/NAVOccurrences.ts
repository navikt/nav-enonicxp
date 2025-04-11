import { queryAllLayersToRepoIdBuckets } from '../localization/layers-repo-utils/query-all-layers';
import { getRepoConnection } from '../repos/repo-utils';
import { getMiscRepoConnection } from '../repos/misc-repo';
import { MISC_REPO_ID, URLS } from '../constants';
import { buildEditorPath } from '../paths/editor-path';
import { Content } from '/lib/xp/content';
import { contentTypesRenderedByPublicFrontend } from '../../lib/contenttype-lists';

import * as nodeLib from '/lib/xp/node';

import { logger } from '../utils/logging';

type NAVToNavResult = {
    occurrences: ContentDataSimple[];
};

type ContentDataSimple = Pick<
    Content,
    '_id' | '_path' | 'createdTime' | 'modifiedTime' | 'type' | 'displayName'
> & {
    repoId: string;
    editorUrl: string;
    errors: string[];
};

const LOG_DIR = 'NAV-occurrence-logs';
const LOG_DIR_PATH = `/${LOG_DIR}`;

const escapeString = (str: string): string => {
    if (typeof str !== 'string') {
        return str;
    }
    return str.replace(/"/g, '');
};

const simplifyContent = (content: nodeLib.RepoNode<Content>, repoId: string): ContentDataSimple => {
    const { _id, _path, createdTime, modifiedTime, type, displayName } = content;

    const escapedDisplayName = escapeString(displayName);

    return {
        _id,
        _path,
        displayName: escapedDisplayName,
        editorUrl: `${URLS.PORTAL_ADMIN_ORIGIN}${buildEditorPath(_id, repoId)}`,
        createdTime,
        modifiedTime,
        type,
        repoId,
        errors: [],
    };
};

const persistResultLogs = (result: NAVToNavResult, startTs: string, jobName: string) => {
    const repoConnection = getMiscRepoConnection();

    if (!repoConnection.exists(LOG_DIR_PATH)) {
        repoConnection.create({ _parentPath: '/', _name: LOG_DIR });
    }

    const now = new Date().toISOString();

    const logEntryName = `nav-occurrence-${jobName}-${now}`;
    const logEntryDataToolboxUrl = [
        URLS.PORTAL_ADMIN_ORIGIN,
        '/admin/tool/systems.rcd.enonic.datatoolbox/data-toolbox#node?repo=',
        MISC_REPO_ID,
        '&branch=master&path=',
        encodeURIComponent(`${LOG_DIR_PATH}/${logEntryName}`),
    ].join('');

    repoConnection.create({
        _parentPath: LOG_DIR_PATH,
        _name: logEntryName,
        summary: {
            started: startTs,
            finished: now,
            jobName,
            totalOccurrences: result.occurrences.length,
        },
        occurcences: result.occurrences,
    });

    logger.info(
        `NAV occurrence result for ${logEntryName}: Total contents found ${result.occurrences.length} |  Full results: ${logEntryDataToolboxUrl}`
    );
};

const hasNAVOccurrences = (obj: any): boolean => {
    // Check null or undefined
    if (obj === null || obj === undefined) {
        return false;
    }

    // Check string values
    if (typeof obj === 'string') {
        return obj.includes('NAV');
    }

    // Check arrays
    if (Array.isArray(obj)) {
        return obj.some((item) => hasNAVOccurrences(item));
    }

    // Check objects (but only if it's actually an object type)
    if (typeof obj === 'object') {
        return Object.values(obj).some((value) => hasNAVOccurrences(value));
    }

    // For other primitive types (number, boolean, etc.)
    return false;
};

export const NAVOccurences = () => {
    const hitsPerRepo = queryAllLayersToRepoIdBuckets({
        branch: 'master',
        state: 'localized',
        resolveContent: false,
        queryParams: {
            count: 20000,
            sort: 'modifiedTime DESC',
            filters: {
                boolean: {
                    must: {
                        hasValue: {
                            field: 'type',
                            values: contentTypesRenderedByPublicFrontend,
                        },
                    },
                },
            },
        },
    });

    const result: NAVToNavResult = {
        occurrences: [],
    };

    Object.entries(hitsPerRepo).forEach(([repoId, hits]) => {
        const layerRepo = getRepoConnection({ repoId, branch: 'master', asAdmin: true });

        logger.info(
            `Searching total ${hits.length} contents in repo ${repoId} for NAV occurrences`
        );

        hits.forEach((contentId) => {
            const content = layerRepo.get<Content>({
                key: contentId,
            });

            if (!content) {
                return;
            }

            const hasNAV = hasNAVOccurrences(content);

            if (hasNAV) {
                result.occurrences.push(simplifyContent(content, repoId));
            }
        });
    });

    persistResultLogs(result, new Date().toISOString(), 'NAVToNav');
};
