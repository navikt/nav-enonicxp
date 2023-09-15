import { getRepoConnection } from './utils/repo-utils';
import { RepoConnection, RepoNode } from '/lib/xp/node';
import { CONTENT_ROOT_REPO_ID } from './constants';
import { logger } from './utils/logging';
import { Content } from '/lib/xp/content';

const addHtmlAreaIndexConfig = (
    repo: RepoConnection,
    fragment: RepoNode<Content<'portal:fragment'>>
): 'changed' | 'unchanged' | 'error' => {
    const { _id, _path, _indexConfig } = fragment;
    const { configs } = _indexConfig;

    if (!configs) {
        logger.error(`Fragment ${_path} has no configs!`);
        return 'error';
    }

    const hasHtmlAreaConfig = configs.some(
        (config) => config.path === 'components.part.config.no-nav-navno.html-area'
    );

    const hasHtmlAreaHtmlConfig = configs.some(
        (config) => config.path === 'components.part.config.no-nav-navno.html-area.html'
    );

    if (hasHtmlAreaConfig && hasHtmlAreaHtmlConfig) {
        logger.info(`Fragment ${_path} already has updated index configs`);
        return 'unchanged';
    }

    try {
        repo.modify({
            key: _id,
            editor: (node) => {
                if (!hasHtmlAreaConfig) {
                    logger.info(`Adding html-area config to ${_path}`);

                    node._indexConfig.configs.push({
                        path: 'components.part.config.no-nav-navno.html-area',
                        config: {
                            decideByType: true,
                            enabled: true,
                            nGram: false,
                            fulltext: false,
                            includeInAllText: false,
                            path: false,
                            indexValueProcessors: [],
                            languages: [],
                        },
                    });
                }

                if (!hasHtmlAreaHtmlConfig) {
                    logger.info(`Adding html-area.html config to ${_path}`);

                    node._indexConfig.configs.push({
                        path: 'components.part.config.no-nav-navno.html-area.html',
                        config: {
                            decideByType: false,
                            enabled: true,
                            nGram: true,
                            fulltext: true,
                            includeInAllText: true,
                            path: false,
                            indexValueProcessors: ['htmlStripper'],
                            languages: [],
                        },
                    });
                }

                return node;
            },
        });

        logger.info(`Modifying ${_path}`);

        return 'changed';
    } catch (e) {
        logger.error(`Error while modifying fragment ${_path} - ${e}`);
        return 'error';
    }
};

export const oneTimeReindexFragmentsJob = () => {
    const draftRepo = getRepoConnection({
        branch: 'draft',
        repoId: CONTENT_ROOT_REPO_ID,
        asAdmin: true,
    });

    const masterRepo = getRepoConnection({
        branch: 'master',
        repoId: CONTENT_ROOT_REPO_ID,
        asAdmin: true,
    });

    const draftFragmentHits = draftRepo.query({
        count: 2000,
        query: 'type="portal:fragment" AND components.part.descriptor="no.nav.navno:html-area" AND _path LIKE "/content*"',
    }).hits;

    logger.info(`Found ${draftFragmentHits.length} fragments`);

    let count = 0;
    const fragmentsWithErrors: string[] = [];

    draftFragmentHits.forEach(({ id }) => {
        const draftFragment = draftRepo.get<Content<'portal:fragment'>>(id);
        if (!draftFragment) {
            logger.error(`Node not found for fragment - ${id}`);
            fragmentsWithErrors.push(id);
            return;
        }

        const masterFragment = masterRepo.get<Content<'portal:fragment'>>(id);
        if (masterFragment) {
            const masterResult = addHtmlAreaIndexConfig(draftRepo, masterFragment);

            if (masterResult === 'error') {
                logger.error(`Failed to modify fragment in master - ${id}`);
                fragmentsWithErrors.push(id);
                return;
            }

            draftRepo.push({ key: id, target: 'master', resolve: false, includeChildren: false });

            const draftIsSameVersion = draftFragment._versionKey === masterFragment._versionKey;
            if (draftIsSameVersion) {
                logger.info(
                    `Master node is the same version as draft - ${id} - ${masterFragment._versionKey}`
                );

                if (masterResult === 'changed') {
                    count++;
                }

                return;
            }
        } else {
            logger.info(`Node not found in master - ${id}`);
        }

        const draftResult = addHtmlAreaIndexConfig(draftRepo, draftFragment);
        if (draftResult === 'error') {
            logger.error(`Failed to modify fragment in draft - ${id}`);
            fragmentsWithErrors.push(id);
            return;
        }

        if (draftResult === 'changed') {
            count++;
        }
    });

    logger.info(
        `Finished updating index config for ${count}/${draftFragmentHits.length} fragments`
    );

    if (fragmentsWithErrors.length > 0) {
        logger.error(
            `${fragmentsWithErrors.length} fragments had errors! ${fragmentsWithErrors.join(', ')}`
        );
    }
};
