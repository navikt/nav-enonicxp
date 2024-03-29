import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import graphQlLib from '/lib/graphql';
import { logger } from '../../../utils/logging';
import { CreationCallback } from '../../utils/creation-callback-utils';
import { insertOriginalContentTypeField } from './common/original-content-type';

export const internalLinkDataCallback: CreationCallback = (context, params) => {
    const getTarget = (baseContentId: string, contentId: string, count: number): Content | null => {
        count++;
        if (count > 10) {
            logger.critical(
                `internalLinkCallback: Max depth (10)/redirect loop 
                - baseContentId=${baseContentId} 
                - contentId=${contentId}`,
                false,
                true
            );
            return null;
        }
        if (!contentId) {
            return null;
        }

        let content = contentLib.get({ key: contentId });
        if (!content) {
            return null;
        }

        // Keep following internal-links to get final target
        if (content.type === 'no.nav.navno:internal-link') {
            if (!content.data.target) {
                return null;
            }
            content = getTarget(baseContentId, content.data.target, count);
        }
        return content;
    };

    // Resolve final target
    params.fields.target.args = { baseContentId: graphQlLib.GraphQLID };
    params.fields.target.resolve = (env) => {
        const { target } = env.source;
        const { baseContentId } = env.args;
        if (!target) {
            logger.error(
                `internalLinkCallback: No valid target provided in ${baseContentId}`,
                false,
                true
            );
            return null;
        }
        const content = getTarget(baseContentId, target, 0);
        if (!content) {
            logger.error(
                `internalLinkCallback: Content not found in ${baseContentId}`,
                false,
                true
            );
            return null;
        }
        return content;
    };
};

export const internalLinkCallback: CreationCallback = (context, params) => {
    insertOriginalContentTypeField(params);
};
