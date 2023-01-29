import * as contentLib from '/lib/xp/content';
import * as nodeLib from '/lib/xp/node';
import graphQlLib from '/lib/graphql';
import * as contextLib from '/lib/xp/context';
import { getNodeVersions } from '../../../../utils/version-utils';
import { contentRootRepoId } from '../../../../constants';
import { logger } from '../../../../utils/logging';

// Find the original content type for a content source.
//
// Old content is sometimes converted to a redirect-type in order to redirect to newer content.
// We use this originalType-field in the frontend to show a warning in Content Studio when the
// content was originally a different type, and may have content that should be retained for
// archival purposes
export const insertOriginalContentTypeField = (params: graphQlLib.CreateObjectTypeParams) => {
    params.fields.originalType = {
        type: graphQlLib.GraphQLString,
        resolve: (env) => {
            if (contextLib.get().branch !== 'draft') {
                return null;
            }

            const { _id, type: currentType } = env.source;
            if (!_id || !currentType) {
                logger.error(
                    `originalType field can only be inserted on content object sources - source: ${JSON.stringify(
                        env.source
                    )}`
                );
                return null;
            }

            const versions = getNodeVersions({
                nodeKey: _id,
                repo: nodeLib.connect({
                    repoId: contentRootRepoId,
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

            const { type: originalType } = firstContent;

            if (originalType === currentType) {
                return null;
            }

            const typeProps = contentLib.getType(originalType);

            return typeProps?.displayName || null;
        },
    };
};
