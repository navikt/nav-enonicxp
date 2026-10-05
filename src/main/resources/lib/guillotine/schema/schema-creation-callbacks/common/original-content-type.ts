import * as contentLib from '/lib/xp/content';
import * as contextLib from '/lib/xp/context';
import { getNodeVersions } from '../../../../utils/version-utils';
import { logger } from '../../../../utils/logging';
import { getGuillotineContentQueryBaseContentId } from '../../../utils/content-query-context';
import { getContextRepoId } from '../../../../context/run-in-context';
import { ResolverEnv, SchemaExtension } from '../../../utils/creation-callback-utils';

// Find the original content type for a content source.
//
// Old content is sometimes converted to a redirect-type in order to redirect to newer content.
// We use this originalType-field in the frontend to show a warning in Content Studio when the
// content was originally a different type, and may have content that should be retained for
// archival purposes
const resolveOriginalType = (env: ResolverEnv) => {
    const { branch } = contextLib.get();

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
        return null;
    }

    const versions = getNodeVersions({
        nodeKey: _id,
        repoId: getContextRepoId(),
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

    return typeProps?.title || null;
};

// Adds the originalType field to a content type
export const originalContentTypeExtension: SchemaExtension = (graphQL, typeName) => ({
    creationCallbacks: {
        [typeName]: (params) => {
            params.addFields({
                originalType: { type: graphQL.GraphQLString },
            });
        },
    },
    resolvers: {
        [typeName]: {
            originalType: resolveOriginalType,
        },
    },
});
