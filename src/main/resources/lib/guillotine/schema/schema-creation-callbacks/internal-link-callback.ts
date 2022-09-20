import contentLib, { Content } from '/lib/xp/content';
import nodeLib from '/lib/xp/node';
import graphQlLib from '/lib/graphql';
import contextLib from '/lib/xp/context';
import { logger } from '../../../utils/logging';
import { CreationCallback } from '../../utils/creation-callback-utils';
import { getNodeVersions } from '../../../utils/version-utils';
import { appDescriptor, contentRepo } from '../../../constants';

const internalLinkContentType = `${appDescriptor}:internal-link`;

export const internalLinkDataCallback: CreationCallback = (context, params) => {
    const getTarget = (contentId: string, count: number): Content | null => {
        count++;
        if (count > 10) {
            logger.critical(
                `internalLinkCallback: Max depth (10)/redirect loop - ContentId=${contentId}`
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
    };
};

export const internalLinkCallback: CreationCallback = (context, params) => {
    // Find the original content type for the internal-link.
    //
    // Old content is sometimes converted to an internal-link in order to redirect to newer content.
    // We use this originalType-field in the frontend to show a warning in Content Studio that the
    // content was originally a different type, which may have had content that should be retained
    // for archival purposes
    params.fields.originalType = {
        type: graphQlLib.GraphQLString,
        resolve: (env) => {
            if (contextLib.get().branch !== 'draft') {
                return null;
            }

            const versions = getNodeVersions({
                nodeKey: env.source._id,
                repo: nodeLib.connect({
                    repoId: contentRepo,
                    branch: 'draft',
                }),
                branch: 'draft',
            });

            const firstVersion = versions[versions.length - 1];

            const firstContent = contentLib.get({
                key: firstVersion.nodeId,
                versionId: firstVersion.versionId,
            });

            if (!firstContent) {
                logger.error(
                    `Could not get first version of content node ${firstVersion.nodeId} - ${firstVersion.versionId}`
                );
                return null;
            }

            const { type } = firstContent;

            if (type === internalLinkContentType) {
                return null;
            }

            const typeProps = contentLib.getType(type);

            return typeProps?.displayName || null;
        },
    };
};
