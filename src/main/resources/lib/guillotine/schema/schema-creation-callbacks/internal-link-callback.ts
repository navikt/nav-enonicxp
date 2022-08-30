import contentLib from '/lib/xp/content';
import { logger } from '../../../utils/logging';
import { CreationCallback } from '../../utils/creation-callback-utils';

export const internalLinkCallback: CreationCallback = (context, params) => {

    const getTarget = (contentId: string, count: number): contentLib.Content | null => {

        count++;
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
            content = getTarget(content.data.target, count);
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
        const content = getTarget(target, 0);
        if (!content) {
            logger.error(`internalLinkCallback: Content not found target=${target}`);
            return null;
        }
        return content;
    }
};
