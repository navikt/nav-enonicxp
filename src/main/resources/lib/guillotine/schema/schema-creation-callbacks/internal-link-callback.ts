import contentLib from '/lib/xp/content';
import graphQlLib from '/lib/graphql';
import { logger } from '../../../utils/logging';
import { CreationCallback, graphQlCreateObjectType } from '../../utils/creation-callback-utils';

export const internalLinkCallback: CreationCallback = (context, params) => {

    let count = 0;

    const publish = graphQlCreateObjectType(context, {
        name: context.uniqueName('Publish'),
        description: 'Publish',
        fields: {
            first: { type: graphQlLib.DateTime },
            from: { type: graphQlLib.DateTime },
        },
    });

    const internalLinkUrl = graphQlCreateObjectType(context, {
        name: context.uniqueName('resolvedInternalLink'),
        description: 'resolvedInternalLink',
        fields: {
            __typename: { type: graphQlLib.GraphQLString },
            _id: { type: graphQlLib.GraphQLString },
            _path: { type: graphQlLib.GraphQLString },
            type: { type: graphQlLib.GraphQLString },
            created: { type: graphQlLib.DateTime },
            modifiedTime: { type: graphQlLib.DateTime },
            displayName: { type: graphQlLib.GraphQLString },
            language: { type: graphQlLib.GraphQLString },
            publish: { type: publish },
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

    logger.info(`internalLinkCallback: count=[${count}]`);
    // Resolve final target
    params.fields.target = {
        args: { contentId: graphQlLib.GraphQLID },
        type: internalLinkUrl,
        resolve: (env) => {
            count++;
            const {contentId} = env.args;
            logger.info(`internalLinkCallback[${count}]: contentID=${contentId}`);
            if (!contentId) {
                logger.error('No contentId provided for internal-link resolver');
                return undefined;
            }
            const content = getTarget(contentId);
            if (!content) {
                logger.error(`Content not found for internal-link id ${contentId}`);
                return undefined;
            }
            logger.info(`internalLinkCallback: final target=[${JSON.stringify(content, null, 2)}]`);
            return content;
        }
    }
};
