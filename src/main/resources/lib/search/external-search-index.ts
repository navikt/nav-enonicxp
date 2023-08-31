import * as taskLib from '/lib/xp/task';
import httpClient from '/lib/http-client';
import { RepoNode } from '/lib/xp/node';
import { Content } from '/lib/xp/content';
import { stripPathPrefix } from '../paths/path-utils';
import { URLS } from '../constants';
import { Audience } from '../../site/mixins/audience/audience';
import { forceArray } from '../utils/array-utils';
import { logger } from '../utils/logging';
import { isMedia } from '../utils/content-utils';

const SERVICE_URL = 'https://navno-search-api.intern.dev.nav.no/content/personbruker';

type IndexableContentNode = RepoNode<any> & {
    data: { title?: string; ingress?: string; text?: string; audience?: Audience };
};

type SearchIndexDocument = {
    id: string;
    href: string;
    title: string;
    ingress: string;
    text: string;
    metadata: {
        createdAt: string;
        lastUpdated: string;
        audience: string[];
        language: string;
        isFile?: boolean;
        fylke?: string;
        metatags?: string[];
    };
};

const buildDocumentId = (content: IndexableContentNode, locale: string) =>
    `${content._id}-${locale}`;

const buildDocument = (content: IndexableContentNode, locale: string): SearchIndexDocument => {
    return {
        id: buildDocumentId(content, locale),
        href: `${URLS.FRONTEND_ORIGIN}${stripPathPrefix(content._path)}`,
        title: content.data.title || content.displayName,
        ingress: content.data.ingress || '',
        text: content.data.text || '',
        metadata: {
            createdAt: content.createdTime,
            lastUpdated: content.modifiedTime,
            audience: forceArray(content.data.audience?._selected || 'privatperson'),
            language: content.language,
            isFile: isMedia(content),
        },
    };
};

const postDocument = (document: SearchIndexDocument) => {
    logger.info(`Posting ${JSON.stringify(document)} to search index`);

    const response = httpClient.request({
        url: SERVICE_URL,
        method: 'POST',
        contentType: 'application/json',
        connectionTimeout: 10000,
        body: JSON.stringify([document]),
    });

    logger.info(`[POST] Response from search index api: ${response.status} - ${response.message}`);
};

const deleteDocument = (id: string) => {
    logger.info(`Deleting ${id} from search index`);

    const response = httpClient.request({
        url: `${SERVICE_URL}/${id}`,
        method: 'DELETE',
        connectionTimeout: 10000,
    });

    logger.info(`[DELETE]Response from search index api: ${response.status} - ${response.message}`);
};

const _externalSearchIndexHandler = (content: RepoNode<Content>, locale: string) => {
    const document = buildDocument(content, locale);

    taskLib.executeFunction({
        description: `Updating external search index for ${content._path} - ${locale}`,
        func: () => postDocument(document),
    });
};

const _externalSearchDeleteDocument = (contentId: string, locale: string) => {
    const id = buildDocumentId(contentId, locale);

    taskLib.executeFunction({
        description: `Deleting document from external search index for ${id}`,
        func: () => deleteDocument(id),
    });
};

export const externalSearchIndexHandler =
    app.config.env === 'dev' ? _externalSearchIndexHandler : () => ({});

export const externalSearchDeleteDocument =
    app.config.env === 'dev' ? _externalSearchDeleteDocument : () => ({});
