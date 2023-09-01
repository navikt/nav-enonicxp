import * as taskLib from '/lib/xp/task';
import httpClient from '/lib/http-client';
import { RepoNode } from '/lib/xp/node';
import { Content } from '/lib/xp/content';
import { URLS } from '../../constants';
import { forceArray } from '../../utils/array-utils';
import { logger } from '../../utils/logging';
import { isMedia } from '../../utils/content-utils';
import { generateSearchDocumentId } from './utils';
import { getSearchNodeHref } from '../create-or-update-search-node';

const SERVICE_URL = URLS.SEARCH_API_URL;

const BATCH_SIZE = 100;

type IndexableContentNode = RepoNode<Content> & {
    data?: {
        title?: string;
        ingress?: string;
        text?: string;
        audience?: { _selected: string } | string;
    };
};

type MetaTag =
    | 'kontor'
    | 'skjema'
    | 'nyhet'
    | 'pressemelding'
    | 'nav-og-samfunn'
    | 'analyse'
    | 'statistikk';

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
        metatags?: MetaTag[];
    };
};

const audienceMap: Record<string, string> = {
    person: 'privatperson',
    employer: 'arbeidsgiver',
    provider: 'samarbeidspartner',
    other: 'andre',
};

const getMetaTags = (content: IndexableContentNode) => {
    const { type, _path, data } = content;

    const metaTags: MetaTag[] = [];

    if (type === 'no.nav.navno:office-branch') {
        metaTags.push('kontor');
    }

    if (type === 'no.nav.navno:form-details') {
        metaTags.push('skjema');
    }

    if (type === 'no.nav.navno:main-article') {
        if (data.contentType === 'news') {
            metaTags.push('nyhet');
        }

        if (data.contentType === 'pressRelease') {
            metaTags.push('pressemelding');
        }
    }

    if (
        _path.startsWith('/content/www.nav.no/no/nav-og-samfunn/statistikk') &&
        (type !== 'no.nav.navno:main-article' || data.contentType !== 'lastingContent')
    ) {
        metaTags.push('statistikk');
    }

    if (_path.startsWith('/content/www.nav.no/no/nav-og-samfunn/kunnskap')) {
        metaTags.push('analyse');
    }

    return metaTags.length > 0 ? metaTags : undefined;
};

const getFylke = (content: IndexableContentNode) => {
    return content._path.match(/\/content\/www\.nav\.no\/no\/lokalt\/(([a-z]|-)+)/)?.[1];
};

const getAudience = (content: IndexableContentNode) => {
    const audienceSelected =
        typeof content.data?.audience === 'string'
            ? content.data.audience
            : content.data?.audience?._selected || 'person';

    return forceArray(audienceSelected).map((audience) => audienceMap[audience]);
};

const buildDocument = (
    content: IndexableContentNode,
    locale: string
): SearchIndexDocument | null => {
    if (!content) {
        return null;
    }

    const href = getSearchNodeHref(content, locale);
    if (!href) {
        return null;
    }

    return {
        id: generateSearchDocumentId(content._id, locale),
        href,
        title: content.data?.title || content.displayName,
        ingress: content.data?.ingress || '',
        text: content.data?.text || '',
        metadata: {
            createdAt: content.createdTime,
            lastUpdated: content.modifiedTime,
            language: content.language,
            audience: getAudience(content),
            isFile: isMedia(content),
            fylke: getFylke(content),
            metatags: getMetaTags(content),
        },
    };
};

const postDocuments = (documents: SearchIndexDocument[]) => {
    logger.info(`Posting ${documents.length} documents to search index`);

    for (let i = 0; i < documents.length; i += BATCH_SIZE) {
        const documentsBatch = documents.slice(i, i + BATCH_SIZE);

        try {
            const body = JSON.stringify(documentsBatch);

            logger.info(
                `[POST] Sending batch ${i} - ${i + documentsBatch.length} with size ${body.length}`
            );

            const response = httpClient.request({
                url: SERVICE_URL,
                method: 'POST',
                contentType: 'application/json',
                connectionTimeout: 30000,
                body,
            });

            logger.info(
                `[POST] Response from search api for batch ${i} - ${i + documentsBatch.length}: ${
                    response.status
                } - ${response.message}`
            );
        } catch (e) {
            logger.error(
                `Error from search index service for batch ${i} - ${
                    i + documentsBatch.length
                } - ${e}`
            );
        }
    }
};

const _externalSearchCreateOrUpdateDocuments = (
    contents: Array<{
        content: IndexableContentNode;
        locale: string;
    }>
) => {
    if (contents.length === 0) {
        return;
    }

    const documents = contents.reduce<SearchIndexDocument[]>((acc, { content, locale }) => {
        const document = buildDocument(content, locale);
        if (document) {
            acc.push(document);
        }

        return acc;
    }, []);

    taskLib.executeFunction({
        description: `Updating external search document for ${documents.length} contents`,
        func: () => postDocuments(documents),
    });
};

export const externalSearchCreateOrUpdateDocuments = SERVICE_URL
    ? _externalSearchCreateOrUpdateDocuments
    : () => ({});
