import { ReferencesFinder } from '../reference-search/references-finder';
import { updateExternalSearchDocumentForContent } from './update-one';

const REFERENCE_SEARCH_TIMEOUT_MS = 10000;

// If ie. a fragment was updated, we need to update all documents that reference it
export const updateExternalSearchDocumentsForAllReferences = (
    contentId: string,
    repoId: string
) => {
    // Search for all references to this content and update each
    const contentReferenceFinder = new ReferencesFinder({
        contentId,
        branch: 'main',
        repoId,
        withDeepSearch: true,
        timeout: REFERENCE_SEARCH_TIMEOUT_MS,
    });

    const references = contentReferenceFinder.run();

    if (!references) {
        return;
    }

    references.forEach((content) => {
        updateExternalSearchDocumentForContent(content._id, repoId);
    });
};
