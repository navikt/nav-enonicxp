import contentLib from '/lib/xp/content';
import { logger } from '../../../utils/logging';
import { CreationCallback } from '../../utils/creation-callback-utils';

export const internalLinkCallback: CreationCallback = (context: any, params) => {

    logger.info('internalLinkCallback');

    const getTarget = (contentId: string): contentLib.Content | null => {
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

    // Resolve target
    params.fields.data.resolve = (env) => {
        const { contentId } = env.args;
        if (!contentId) {
            logger.error('No contentId provided for internal-link resolver');
            return undefined;
        }
        const content = getTarget(contentId);
        if (!content) {
            logger.error(`Content not found for internal-link id ${contentId}`);
            return undefined;
        }
        logger.info(`target: ${content.data}`);
        return content.data;
    }
};
