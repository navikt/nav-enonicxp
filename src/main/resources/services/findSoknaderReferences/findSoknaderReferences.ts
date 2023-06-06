import * as contentLib from '/lib/xp/content';
import * as taskLib from '/lib/xp/task';
import { validateServiceSecretHeader } from '../../lib/utils/auth-utils';
import { CONTENT_STUDIO_EDIT_PATH_PREFIX, URLS } from '../../lib/constants';
import { logger } from '../../lib/utils/logging';

type ResultItem = {
    displayName: string;
    editorUrl: string;
    references: Array<{
        displayName: string;
        url: string;
        type: string;
    }>;
};

const findSoknaderReferences = (id: string) => {
    return contentLib.query({
        count: 2000,
        contentTypes: [
            'no.nav.navno:main-article',
            'no.nav.navno:page-list',
            'no.nav.navno:section-page',
            'no.nav.navno:content-list',
        ],
        query: `data.text LIKE "*${id}*" OR data.fact LIKE "*${id}*" OR _references="${id}"`,
    }).hits;
};

const getEditorUrl = (id: string) =>
    `${URLS.PORTAL_ADMIN_ORIGIN}${CONTENT_STUDIO_EDIT_PATH_PREFIX}/${id}`;

const getResult = () => {
    return contentLib
        .query({
            count: 2000,
            contentTypes: ['no.nav.navno:external-link'],
            query: 'data.url LIKE "*www.nav.no/soknader*" AND data.url NOT LIKE "*www.nav.no/soknader/en*"',
        })
        .hits.reduce<ResultItem[]>((acc, externalLinkContent, index, array) => {
            const { _id, displayName } = externalLinkContent;

            const references = findSoknaderReferences(_id);
            if (references.length > 0) {
                acc.push({
                    displayName,
                    editorUrl: getEditorUrl(_id),
                    references: references.map((refContent) => ({
                        displayName: refContent.displayName,
                        url: getEditorUrl(refContent._id),
                        type: refContent.type,
                    })),
                });
            }

            const num = index + 1;
            if (num % 10 === 0 || num === array.length) {
                logger.info(`Processed ${num}/${array.length} external links`);
            }

            return acc;
        }, []);
};

let savedResult: { ts: number; result: ReturnType<typeof getResult> } | null = null;
let inProgress = false;

// TODO: one-time job which can be removed asap
export const get = (req: XP.Request) => {
    if (!validateServiceSecretHeader(req)) {
        return {
            status: 401,
            body: {
                message: 'Not authorized',
            },
            contentType: 'application/json',
        };
    }

    if (!inProgress && !savedResult) {
        taskLib.executeFunction({
            description: `Finding references to /soknader lenker`,
            func: () => {
                inProgress = true;
                const start = Date.now();
                logger.info(`Starting soknader references finder job at ${start}`);

                try {
                    savedResult = {
                        ts: start,
                        result: getResult(),
                    };
                } catch (e) {
                    logger.error(`Soknader references error: ${e}`);
                } finally {
                    inProgress = false;
                }

                logger.info(`Finished soknader references finder job after ${Date.now() - start}`);
            },
        });
    }

    return {
        status: 200,
        body: savedResult,
        contentType: 'application/json',
    };
};
