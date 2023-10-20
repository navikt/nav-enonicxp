import { Content } from '/lib/xp/content';
import { RepoNode } from '/lib/xp/node';
import { forceArray } from '../../../utils/array-utils';
import { getSearchNodeHref } from '../../create-or-update-search-node';
import { generateSearchDocumentId } from '../utils';
import { isMedia } from '../../../utils/content-utils';
import { getNestedValues } from '../../../utils/object-utils';
import { getExternalSearchConfig } from '../config';
import { logger } from '../../../utils/logging';
import { SearchDocumentFylke, getSearchDocumentFylke } from './field-resolvers/fylke';
import { SearchDocumentMetatag, getSearchDocumentMetatags } from './field-resolvers/metatags';
import { getSearchDocumentAudience, SearchDocumentAudience } from './field-resolvers/audience';
import { getSearchDocumentTextSegments } from './field-resolvers/text';

type SearchConfig = Content<'no.nav.navno:search-config-v2'>;
type KeysConfig = Partial<SearchConfig['data']['defaultKeys']>;
type MetaKey = keyof KeysConfig;

type ContentNode = RepoNode<Content>;

export type SearchDocument = {
    id: string;
    href: string;
    title: string;
    ingress: string;
    text: string;
    metadata: {
        createdAt: string;
        lastUpdated: string;
        language: string;
        isFile?: boolean;
        audience: SearchDocumentAudience[];
        metatags?: SearchDocumentMetatag[];
        fylke?: SearchDocumentFylke;
        keywords?: string[];
    };
};

class ExternalSearchDocumentBuilder {
    private readonly content: ContentNode;
    private readonly locale: string;
    private readonly searchConfig: SearchConfig;
    private readonly contentGroupKeys: KeysConfig;

    constructor(
        content: ContentNode,
        locale: string,
        searchConfig: SearchConfig,
        contentGroupKeys: KeysConfig
    ) {
        this.content = content;
        this.locale = locale;
        this.searchConfig = searchConfig;
        this.contentGroupKeys = contentGroupKeys;
    }

    public build(): SearchDocument | null {
        const { content, locale } = this;

        const href = getSearchNodeHref(content, locale);
        if (!href) {
            logger.error(`No href found for ${content._id} / ${locale}`);
            return null;
        }

        const title = this.getTitle();
        if (!title) {
            logger.error(`No title found for ${content._id} / ${locale}`);
            return null;
        }

        return {
            id: generateSearchDocumentId(content._id, locale),
            href,
            title,
            ingress: this.getIngress(),
            text: this.getText(),
            metadata: {
                audience: getSearchDocumentAudience(content),
                language: this.getLanguage(),
                fylke: getSearchDocumentFylke(content),
                metatags: getSearchDocumentMetatags(content),
                isFile: isMedia(content),
                createdAt: content.createdTime,
                lastUpdated: content.modifiedTime,
                keywords: forceArray(content.data.keywords),
            },
        };
    }

    private getFirstMatchingFieldValue(metaKey: MetaKey) {
        const fieldKeys = this.getFieldKeys(metaKey);

        for (const key of fieldKeys) {
            const value = getNestedValues(this.content, key);
            if (!value) {
                continue;
            }

            if (Array.isArray(value)) {
                const stringValue = value.find((item) => typeof item === 'string');
                if (stringValue) {
                    return stringValue;
                }
            } else if (typeof value === 'string') {
                return value;
            }
        }

        return null;
    }

    private getFieldKeys(metaKey: MetaKey) {
        const fieldKeys: string[] = [];

        if (this.contentGroupKeys) {
            const contentConfigKeys = forceArray(this.contentGroupKeys[metaKey]);
            fieldKeys.push(...contentConfigKeys);
        }

        const defaultConfigKeys = forceArray(this.searchConfig.data.defaultKeys[metaKey]);
        fieldKeys.push(...defaultConfigKeys);

        return fieldKeys.filter(Boolean);
    }

    private getTitle(): string | null {
        return this.getFirstMatchingFieldValue('titleKey') || null;
    }

    private getIngress(): string {
        return this.getFirstMatchingFieldValue('ingressKey') || '';
    }

    private getText(): string {
        const fieldKeys = this.getFieldKeys('textKey');
        return getSearchDocumentTextSegments(this.content, fieldKeys).join('\n');
    }

    private getLanguage(): string {
        return this.content.language === 'no' ? 'nb' : this.content.language;
    }
}

const getContentGroupKeys = (searchConfig: SearchConfig, content: ContentNode) => {
    const contentGroupConfig = forceArray(searchConfig.data.contentGroups).find((group) =>
        forceArray(group.contentTypes).some((contentType) => contentType === content.type)
    )?.groupKeys;

    return contentGroupConfig;
};

export const buildExternalSearchDocument = (
    content: ContentNode,
    locale: string
): SearchDocument | null => {
    if (!content?.data) {
        logger.error('No content data found!');
        return null;
    }

    const searchConfig = getExternalSearchConfig();
    if (!searchConfig) {
        logger.error('No search config found!');
        return null;
    }

    const contentGroupKeys = getContentGroupKeys(searchConfig, content);
    if (!contentGroupKeys) {
        logger.info(
            `Search is not configured for content-type ${content.type} - Content: ${content._id} / ${locale}`
        );
        return null;
    }

    return new ExternalSearchDocumentBuilder(
        content,
        locale,
        searchConfig,
        contentGroupKeys
    ).build();
};
