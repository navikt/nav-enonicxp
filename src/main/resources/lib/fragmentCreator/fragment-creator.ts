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

    // Only transform after a fragment type has been selected, and the content has been saved
    // (indicated by no longer using the placeholder "__unnamed__*" name
    if (!fragmentType || content._name.startsWith('__unnamed__')) {
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
