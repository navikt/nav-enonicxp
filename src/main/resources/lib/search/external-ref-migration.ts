import { getRepoConnection } from '../utils/repo-utils';
import { CONTENT_ROOT_REPO_ID } from '../constants';
import { logger } from '../utils/logging';
import { Content } from '/lib/xp/content';

export const migrateExternalSearchContentRefs = () => {
    const draftRepo = getRepoConnection({
        repoId: CONTENT_ROOT_REPO_ID,
        asAdmin: true,
        branch: 'draft',
    });

    const masterRepo = getRepoConnection({
        repoId: CONTENT_ROOT_REPO_ID,
        asAdmin: true,
        branch: 'master',
    });

    const legacyRefs = draftRepo
        .query({
            count: 1000,
            filters: {
                hasValue: {
                    field: 'type',
                    values: ['navno.nav.no.search:search-api2'],
                },
            },
        })
        .hits.map((hit) => hit.id);

    logger.info(`Found ${legacyRefs.length} legacy search references - migrating`);

    legacyRefs.forEach((contentId) => {
        draftRepo.modify<Content>({
            key: contentId,
            editor: (content) => {
                logger.info(`Migrating ${content._id} / ${content.displayName}`);
                content.type = 'no.nav.navno:external-search-content';
                return content;
            },
        });

        if (masterRepo.exists(contentId)) {
            logger.info(`Pushing ${contentId} to master`);
            draftRepo.push({
                key: contentId,
                includeChildren: false,
                resolve: false,
                target: 'master',
            });
        }
    });
};
