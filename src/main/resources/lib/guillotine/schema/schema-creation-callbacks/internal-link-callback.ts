import contentLib from '/lib/xp/content';
import graphQlLib from '/lib/graphql';
import { logger } from '../../../utils/logging';
import { CreationCallback, graphQlCreateObjectType } from '../../utils/creation-callback-utils';

export const internalLinkCallback: CreationCallback = (context, params) => {

    const internalLinkUrl = graphQlCreateObjectType(context, {
        name: context.uniqueName('resolvedInternalLink'),
        description: 'resolvedInternalLink',
        fields: {
            targetUrl: { type: graphQlLib.GraphQLString }
        },
    });

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

    // Resolve targetUrl
    params.fields.targetUrl = {
        args: { contentId: graphQlLib.GraphQLID },
        type: internalLinkUrl,
        resolve: (env) => {
            logger.info(`internalLinkCallback-resolve: ${JSON.stringify(env, null, 4)}`);
            const {contentId} = env.args;
            if (!contentId) {
                logger.error('No contentId provided for internal-link resolver');
                return undefined;
            }
            const content = getTarget(contentId);
            if (!content) {
                logger.error(`Content not found for internal-link id ${contentId}`);
                return undefined;
            }
            logger.info(`targetUrl: ${content._path}`);
            return content._path;
        }
    }
};
