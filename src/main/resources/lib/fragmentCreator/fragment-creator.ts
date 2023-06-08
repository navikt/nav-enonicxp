import { Content } from '/lib/xp/content';
import { getRepoConnection } from '../utils/repo-utils';
import { logger } from '../utils/logging';

export const transformFragmentCreatorToFragment = ({
    content,
    repoId,
}: {
    content: Content<'no.nav.navno:fragment-creator'>;
    repoId: string;
}) => {
    const fragmentType = content.data?.type;
    if (!fragmentType) {
        return;
    }

    const repoConnection = getRepoConnection({ asAdmin: true, repoId, branch: 'draft' });

    try {
        repoConnection.modify({
            key: content._id,
            editor: (node) => {
                node.type = 'portal:fragment';
                node.components = {
                    type: fragmentType,
                    path: '/',
                };

                return node;
            },
        });

        repoConnection.commit({ keys: [content._id] });
    } catch (e) {
        logger.error(`FragmentCreator failed to create fragment - ${e}`);
    }
};
