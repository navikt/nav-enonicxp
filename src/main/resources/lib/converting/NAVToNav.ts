import { queryAllLayersToRepoIdBuckets } from '../localization/layers-repo-utils/query-all-layers';
import { getRepoConnection } from '../repos/repo-utils';
import { ContentDescriptor } from '../../types/content-types/content-config';
import * as nodeLib from '/lib/xp/node';
import { Content } from '/lib/xp/content';
import { logger } from '../utils/logging';

type ContentDataSimple = Pick<
    Content,
    '_id' | '_path' | 'createdTime' | 'modifiedTime' | 'type' | 'displayName'
> & {
    repoId: string;
    errors: string[];
};

const fieldKeysToSearch = ['ingress', 'html', 'text', 'html', 'pressCall', 'body'];

const simplifyContent = (content: Content, repoId: string): ContentDataSimple => {
    const { _id, _path, createdTime, modifiedTime, type, data, displayName } = content;

    return {
        _id,
        _path,
        displayName,
        createdTime,
        modifiedTime,
        type,
        repoId,
        errors: [],
    };
};

type NAVToNavResult = {
    totalFound: number;
    converted: number;
    failed: number;
};
function replaceNavInFields(obj: any, fieldKeysToSearch: string[]): any {
    if (Array.isArray(obj)) {
        return obj.map((item) => replaceNavInFields(item, fieldKeysToSearch));
    } else if (typeof obj === 'object' && obj !== null) {
        const newObj: any = {};
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                if (fieldKeysToSearch.includes(key) && typeof obj[key] === 'string') {
                    newObj[key] = obj[key].replace(/\bNAV\b/g, 'Nav');
                } else {
                    newObj[key] = replaceNavInFields(obj[key], fieldKeysToSearch);
                }
            }
        }
        return newObj;
    }
    return obj;
}

export const convertNAVToNav = () => {
    const hitsPerRepo = queryAllLayersToRepoIdBuckets({
        branch: 'draft',
        state: 'localized',
        resolveContent: false,
        queryParams: {
            count: 20000,
            sort: 'modifiedTime DESC',
            query: {
                boolean: {
                    must: [
                        {
                            term: {
                                field: '_id',
                                value: '092e4dcc-2884-4276-a097-3ece3d4c9fd1',
                            },
                        },
                        {
                            term: {
                                field: 'type',
                                value: 'no.nav.navno:situation-page' satisfies ContentDescriptor,
                            },
                        },
                    ],
                },
            },
        },
    });

    const result: NAVToNavResult = {
        totalFound: 0,
        converted: 0,
        failed: 0,
    };

    Object.entries(hitsPerRepo).forEach(([repoId, hits]) => {
        const layerRepo = getRepoConnection({ repoId, branch: 'draft', asAdmin: true });

        const limitedHits = hits.slice(0, 5);

        logger.info(`Found ${limitedHits.length} contents in repo ${repoId}.`);

        limitedHits.forEach((contentId) => {
            layerRepo.modify({
                key: contentId,
                editor: (node) => {
                    const newNode = JSON.parse(JSON.stringify(node));
                    const replaced = replaceNavInFields(newNode, fieldKeysToSearch);
                    log.info('original node');
                    log.info(JSON.stringify(newNode));
                    log.info('replaced node');
                    log.info(JSON.stringify(replaced));
                    //node.data = replaced.data;
                    //node.displayName = replaced.displayName;
                    //node.components = replaced.components;
                    return node;
                },
            });
        });
    });
};
