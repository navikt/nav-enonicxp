import { Content } from '/lib/xp/content';
import { getRepoConnection } from '../utils/repo-utils';
import { RepoBranch } from '../../types/common';
import { logger } from '../utils/logging';

export const transformFragmentCreatorToFragment = ({
    content,
    branch,
    repoId,
}: {
    content: Content<'no.nav.navno:fragment-creator'>;
    branch: RepoBranch;
    repoId: string;
}) => {
    if (branch !== 'draft') {
        return;
    }

    const fragmentType = content.data?.type;
    if (!fragmentType) {
        return;
    }

    try {
        getRepoConnection({ asAdmin: true, repoId, branch }).modify({
            key: content._id,
            editor: (node) => {
                node.type = 'portal:fragment';
                node.components = {
                    type: fragmentType,
                    [fragmentType]: {},
                    path: '/',
                    config: {},
                };
                node.data = {};

                return node;
            },
        });
    } catch (e) {
        logger.error(`FragmentCreator failed to create fragment - ${e}`);
    }
};
