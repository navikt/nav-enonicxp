import { Content } from '/lib/xp/content';
import { logger } from '../utils/logging';
import { switchContentType } from './content-type-switcher';

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

    const success = switchContentType({
        repoId,
        contentId: content._id,
        contentType: 'portal:fragment',
        editor: (node) => {
            (node as any).components = {
                type: fragmentType,
                path: '/',
            };

            return node;
        },
    });

    if (!success) {
        logger.error(`FragmentCreator failed to create fragment`);
    }
};
