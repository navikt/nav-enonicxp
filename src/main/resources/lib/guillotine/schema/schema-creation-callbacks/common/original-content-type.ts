import * as contentLib from '/lib/xp/content';
import graphQlLib from '/lib/graphql';
import * as contextLib from '/lib/xp/context';
import { getNodeVersions } from '../../../../utils/version-utils';
import { logger } from '../../../../utils/logging';
import { getGuillotineContentQueryBaseContentId } from '../../../utils/content-query-context';
import { contentLibGetStandard } from '../../../../time-travel/standard-functions';

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
            const { branch, repository } = contextLib.get();

            if (branch !== 'draft') {
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

            const baseContentId = getGuillotineContentQueryBaseContentId();
            if (baseContentId !== _id) {
                logger.error(
                    `originalType field can only be resolved for the base content node - source: ${JSON.stringify(
                        env.source
                    )}, baseContentId: ${baseContentId}`
                );
                return null;
            }

            const versions = getNodeVersions({
                nodeKey: _id,
                repoId: repository,
                branch: 'draft',
            });

            const firstVersion = versions[versions.length - 1];

            // Fetch the specific first version directly via the standard content getter.
            // contentLib.get is monkey-patched inside a time-travel context (used for archived
            // content) and would otherwise ignore the versionId and resolve to the target-time
            // version instead of the requested original version.
            const firstContent = contentLibGetStandard({
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

            logger.info(
                `originalType field resolved for content ${_id} - originalType: ${originalType}, currentType: ${currentType}`
            );

            if (originalType === currentType) {
                return null;
            }

            const typeProps = contentLib.getType(originalType);

            return typeProps?.displayName || null;
        },
    };
};
