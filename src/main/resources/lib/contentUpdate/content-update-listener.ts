import * as eventLib from '/lib/xp/event';
import * as contentLib from '/lib/xp/content';
import * as clusterLib from '/lib/xp/cluster';
import { runInContext } from '../context/run-in-context';
import { CONTENT_REPO_PREFIX } from '../constants';
import { transformFragmentCreatorToFragment } from '../fragmentCreator/fragment-creator';
import { isContentLocalized } from '../localization/locale-utils';
import { updateQbrickVideoContent } from './video-update';

let hasContentUpdateListener = false;

const handleEvent = (event: eventLib.EnonicEvent) => {
    if (!clusterLib.isMaster()) {
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

            switch (content.type) {
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
