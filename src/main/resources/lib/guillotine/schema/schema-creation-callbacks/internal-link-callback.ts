import contentLib from '/lib/xp/content';
import { logger } from '../../../utils/logging';
import { CreationCallback } from '../../utils/creation-callback-utils';

export const internalLinkCallback: CreationCallback = (context, params) => {

    let count = 0; // For max-depth check
    const getTarget = (contentId: string): contentLib.Content | null => {

        count++;
        logger.info(`internalLinkCallback: count=[${count}]`);
        if (count > 10) {
            logger.critical(`internalLinkCallback: Max depth (10)/redirect loop - ContentId=${contentId}`);
            return null;
        }
        if (!contentId) {
            return null;
        }

        let content = contentLib.get({key: contentId});
        if (!content) {
            return null;
        }

        // Keep following internal-links to get final target
        if (content.type === 'no.nav.navno:internal-link') {
            if (!content.data.target) {
                return null;
            }
            content = getTarget(content.data.target);
        }
        return content;
    };

    // Resolve final target
    params.fields.target.resolve = (env) => {
        const { target } = env.source;
        if (!target) {
            logger.error('internalLinkCallback: No valid target provided');
            return null;
        }
        const content = getTarget(target);
        if (!content) {
            logger.error(`internalLinkCallback: Content not found target=${target}`);
            return null;
        }
        logger.info(`internalLinkCallback: final target path=[${content._path}]`);
        return content;
    }
};
