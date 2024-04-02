import * as taskLib from '/lib/xp/task';
import { Content } from '/lib/xp/content';
import { logger } from '../utils/logging';
import { generateSearchDocumentId } from './utils';
import { getRepoConnection } from '../utils/repo-utils';
import { getLayersData } from '../localization/layers-data';
import { searchApiPostDocuments } from './api-handlers/post-document';
import { searchApiDeleteDocument } from './api-handlers/delete-document';
import { buildExternalSearchDocument } from './document-builder/document-builder';
import { isContentLocalized } from '../localization/locale-utils';

const deleteExternalSearchDocumentForContent = (contentId: string, locale: string) => {
    const id = generateSearchDocumentId(contentId, locale);

    taskLib.executeFunction({
        description: `Deleting document from external search index for ${id}`,
        func: () => searchApiDeleteDocument(id),
    });
};

export const updateExternalSearchDocumentForContent = (contentId: string, repoId: string) => {
    const locale = getLayersData().repoIdToLocaleMap[repoId];
    if (!locale) {
        logger.error(`${repoId} is not a valid content repo!`);
        return;
    }

    const repo = getRepoConnection({ repoId, branch: 'master', asAdmin: true });

    const content = repo.get<Content>(contentId);
    if (!content || !isContentLocalized(content)) {
        deleteExternalSearchDocumentForContent(contentId, locale);
        return;
    }

    const document = buildExternalSearchDocument(content, locale);
    if (!document) {
        deleteExternalSearchDocumentForContent(contentId, locale);
        return;
    }

    taskLib.executeFunction({
        description: `Updating external search document for ${document.id}`,
        func: () => searchApiPostDocuments([document]),
    });
};
