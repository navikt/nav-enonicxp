import contentLib from '/lib/xp/content';
import graphQlLib from '/lib/graphql';
import { logger } from '../../../utils/logging';
import { CreationCallback } from '../../utils/creation-callback-utils';

export const internalLinkCallback: CreationCallback = (context, params) => {

    let count = 0; // For max-depth check
    logger.info(`internalLinkCallback params=[${JSON.stringify(params, null, 2)}]`);

    const getTarget = (contentId: string): contentLib.Content | null => {

        count++;
        if (count > 10) {
            logger.error('Max depth (10) reached for internal-link resolver');
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
    params.fields.target = {
        type: graphQlLib.reference('Content'),
        resolve: (env) => {
            const { target } = env.source;
            if (!target) {
                logger.error('No valid target provided for internal-link resolver');
                return null;
            }
            const content = getTarget(target);
            if (!content) {
                logger.error(`Content not found for internal-link resolver target=${target}`);
                return null;
            }
            logger.info(`internalLinkCallback: final target path=[${content._path}]`);
            return content;
        }
    }
};
