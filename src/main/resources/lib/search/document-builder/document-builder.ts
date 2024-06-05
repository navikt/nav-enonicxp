import { Content } from '/lib/xp/content';
import { forceArray } from '../../utils/array-utils';
import { generateSearchDocumentId } from '../utils';
import {
    getContentLocaleRedirectTarget,
    isContentNoIndex,
    isContentPreviewOnly,
    isContentPrepublished,
} from '../../utils/content-utils';
import { getNestedValues } from '../../utils/object-utils';
import { getExternalSearchConfig } from '../config';
import { logger } from '../../utils/logging';
import {
    SearchDocumentFylke,
    getSearchDocumentFylke,
    isExcludedLocalContent,
} from './field-resolvers/fylke';
import { SearchDocumentMetatag, getSearchDocumentMetatags } from './field-resolvers/metatags';
import { getSearchDocumentAudience, SearchDocumentAudience } from './field-resolvers/audience';
import { getSearchDocumentTextSegments } from './field-resolvers/text';
import { ContentNode } from '../../../types/content-types/content-config';
import {
    getSearchDocumentContentType,
    SearchDocumentContentType,
} from './field-resolvers/content-type';
import {
    getSearchDocumentLanguage,
    getSearchDocumentLanguageRefs,
} from './field-resolvers/language';
import { isOfficeContent } from '../../office-pages/types';
import {
    buildSearchDocumentIngress,
    buildSearchDocumentOfficeIngress,
} from './field-resolvers/ingress';
import { getSearchNodeHref } from './field-resolvers/href';

type SearchConfig = Content<'no.nav.navno:search-config-v2'>;
type KeysConfig = Partial<SearchConfig['data']['defaultKeys']>;
type MetaKey = keyof KeysConfig;

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
        type: SearchDocumentContentType;
        audience: SearchDocumentAudience[];
        metatags?: SearchDocumentMetatag[];
        fylke?: SearchDocumentFylke;
        keywords?: string[];
        languageRefs?: string[];
    };
};

class ExternalSearchDocumentBuilder {
    private readonly content: ContentNode<any>;
    private readonly locale: string;
    private readonly searchConfig: SearchConfig;
    private readonly contentGroupKeys?: KeysConfig;

    constructor(
        content: ContentNode,
        locale: string,
        searchConfig: SearchConfig,
        contentGroupKeys?: KeysConfig
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
            logger.warning(`No href found for ${content._id} / ${locale}`);
            return null;
        }

        const title = this.getTitle();
        if (!title) {
            logger.error(`No title found for ${content._id} / ${locale}`);
            return null;
        }

        const publishedTime = content.publish?.from || content.createdTime;

        return {
            id: generateSearchDocumentId(content._id, locale),
            href,
            title,
            ingress: this.getIngress(),
            text: this.getText(),
            metadata: {
                audience: getSearchDocumentAudience(content),
                language: getSearchDocumentLanguage(content.language || locale),
                fylke: getSearchDocumentFylke(content),
                metatags: getSearchDocumentMetatags(content),
                type: getSearchDocumentContentType(content),
                createdAt: publishedTime,
                lastUpdated: content.modifiedTime || publishedTime,
                keywords: forceArray(content.data.keywords),
                languageRefs: getSearchDocumentLanguageRefs(content),
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
        const title = this.getFirstMatchingFieldValue('titleKey');
        if (!title) {
            return null;
        }

        if (this.content.type === 'no.nav.navno:form-details') {
            const formNumbers = forceArray(this.content.data.formNumbers);
            if (formNumbers.length > 0) {
                return `${title} (${formNumbers.join(', ')})`;
            }
        }

        return title;
    }

    private getIngress(): string {
        return isOfficeContent(this.content)
            ? buildSearchDocumentOfficeIngress(this.content)
            : buildSearchDocumentIngress(
                  this.getFirstMatchingFieldValue('ingressKey') ||
                      this.getFirstMatchingFieldValue('textKey')
              );
    }

    private getText(): string {
        const fieldKeys = this.getFieldKeys('textKey');
        return getSearchDocumentTextSegments(this.content, fieldKeys).join('\n');
    }
}

const getContentGroupConfig = (searchConfig: SearchConfig, content: ContentNode) => {
    return forceArray(searchConfig.data.contentGroups).find((group) =>
        forceArray(group.contentTypes).some((contentType) => contentType === content.type)
    );
};

const isExcludedContent = (content: ContentNode) => {
    if (!content?.data) {
        return true;
    }

    if (
        isContentPrepublished(content) ||
        isContentNoIndex(content) ||
        isContentPreviewOnly(content) ||
        getContentLocaleRedirectTarget(content) ||
        isExcludedLocalContent(content)
    ) {
        return true;
    }

    switch (content.type) {
        // 'LOKAL' office type is handled by the new office-branch content type
        case 'no.nav.navno:office-information': {
            return content.data.enhet.type === 'LOKAL';
        }
        // Only form details which contain an application should be indexed
        case 'no.nav.navno:form-details': {
            return !forceArray(content.data?.formType).some(
                (formType) => formType._selected === 'application'
            );
        }
        default: {
            return false;
        }
    }
};

export const buildExternalSearchDocument = (
    content: ContentNode,
    locale: string
): SearchDocument | null => {
    if (isExcludedContent(content)) {
        return null;
    }

    const searchConfig = getExternalSearchConfig();
    if (!searchConfig) {
        logger.error('No search config found!');
        return null;
    }

    const contentGroupConfig = getContentGroupConfig(searchConfig, content);
    if (!contentGroupConfig) {
        return null;
    }

    return new ExternalSearchDocumentBuilder(
        content,
        locale,
        searchConfig,
        contentGroupConfig.groupKeys
    ).build();
};
