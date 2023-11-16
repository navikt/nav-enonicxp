import * as eventLib from '/lib/xp/event';
import * as contentLib from '/lib/xp/content';
import { runInContext } from '../context/run-in-context';
import { CONTENT_REPO_PREFIX, CONTENT_ROOT_REPO_ID } from '../constants';
import { transformFragmentCreatorToFragment } from '../content-transformers/fragment-creator';
import { isContentLocalized } from '../localization/locale-utils';
import { updateQbrickVideoContent } from './video-update';
import { logger } from '../utils/logging';
import { isMainDatanode } from '../cluster-utils/main-datanode';
import { contentDataLocaleFallbackRefreshItems } from './content-data-locale-fallback-update';

let hasContentUpdateListener = false;

const handleEvent = (event: eventLib.EnonicEvent) => {
    if (!isMainDatanode()) {
        return;
    }

    event.data.nodes.forEach((node) => {
        const { id, repo } = node;

        if (!repo.startsWith(CONTENT_REPO_PREFIX)) {
            return;
        }

        runInContext({ repository: repo }, () => {
            const content = contentLib.get({ key: id });
            if (!content || !isContentLocalized(content)) {
                return;
            }

            const { _path, type } = content;

            switch (type) {
                case 'no.nav.navno:video': {
                    updateQbrickVideoContent(content);
                    break;
                }
                case 'no.nav.navno:fragment-creator': {
                    transformFragmentCreatorToFragment({
                        content,
                        repoId: repo,
                    });
                    break;
                }
                case 'no.nav.navno:content-data-locale-fallback': {
                    contentDataLocaleFallbackRefreshItems(content);
                    break;
                }
                // These content types should never be localized
                case 'no.nav.navno:payout-dates':
                case 'no.nav.navno:global-value-set':
                case 'no.nav.navno:global-case-time-set': {
                    if (repo !== CONTENT_ROOT_REPO_ID) {
                        const layerId = repo.replace(`${CONTENT_REPO_PREFIX}.`, '');
                        logger.error(
                            `Content on "${_path}" with type "${type}" was localized to layer "${layerId}" - reverting!`
                        );
                        contentLib.resetInheritance({
                            key: id,
                            projectName: layerId,
                            inherit: ['CONTENT', 'PARENT', 'NAME', 'SORT'],
                        });
                    }
                    break;
                }
                case 'no.nav.navno:content-page-with-sidemenus':
                case 'no.nav.navno:situation-page':
                case 'no.nav.navno:guide-page':
                case 'no.nav.navno:themed-article-page':
                case 'no.nav.navno:tools-page':
                case 'no.nav.navno:current-topic-page':
                case 'no.nav.navno:generic-page': {
                    log.info('content was updated');
                }
            }
        });
    });
};

export const activateContentUpdateListener = () => {
    if (hasContentUpdateListener) {
        return;
    }

    hasContentUpdateListener = true;

    eventLib.listener({
        type: 'node.updated',
        callback: handleEvent,
    });
};
