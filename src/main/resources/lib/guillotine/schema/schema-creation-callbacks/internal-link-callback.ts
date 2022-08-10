import contentLib from '/lib/xp/content';
import graphQlLib from '/lib/graphql';
import { logger } from '../../../utils/logging';
import { CreationCallback, graphQlCreateObjectType } from '../../utils/creation-callback-utils';

export const internalLinkCallback: CreationCallback = (context: any, params) => {

    const internalLinkUrl = graphQlCreateObjectType(context, {
        name: context.uniqueName('resolvedInternalLink'),
        description: 'resolvedInternalLink',
        fields: {
            targetUrl: { type: graphQlLib.GraphQLString }
        },
    });

    // Resolve targetUrl
    params.fields.targetUrl = {
        args: { contentId: graphQlLib.GraphQLID },
        type: internalLinkUrl,
        resolve: (env) => {
            const { contentId } = env.args;
            if (!contentId) {
                logger.error('No contentId provided for internal-link resolver');
                return undefined;
            }
            const content = contentLib.get({key: contentId});
            if (!content) {
                logger.error(`Content not found for internal-link id ${contentId}`);
                return undefined;
            }
            logger.info(`targetUrl: ${content._path}`)
            return content._path;
        }
    }
};
