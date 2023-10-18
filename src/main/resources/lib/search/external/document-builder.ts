import { Content } from '/lib/xp/content';
import { RepoNode } from '/lib/xp/node';
import { forceArray } from '../../utils/array-utils';
import { getSearchNodeHref } from '../create-or-update-search-node';
import { generateSearchDocumentId } from './utils';
import { isMedia } from '../../utils/content-utils';
import { getNestedValue } from '../../utils/object-utils';

type SearchConfig = Content<'no.nav.navno:search-config-v2'>;
type KeysConfig = NonNullable<SearchConfig['data']['defaultKeys']>;
type MetaKey = keyof KeysConfig;

type ContentNode = RepoNode<Content>;

type DocumentMetaTag =
    | 'kontor'
    | 'skjema'
    | 'nyhet'
    | 'pressemelding'
    | 'nav-og-samfunn'
    | 'analyse'
    | 'statistikk';

type DocumentAudience = 'privatperson' | 'arbeidsgiver' | 'samarbeidspartner' | 'andre';

export type ExternalSearchDocument = {
    id: string;
    href: string;
    title: string;
    ingress: string;
    text: string;
    keywords?: string[];
    metadata: {
        createdAt: string;
        lastUpdated: string;
        language: string;
        audience: DocumentAudience[];
        metatags?: DocumentMetaTag[];
        fylke?: string;
        isFile?: boolean;
    };
};

const audienceMap: Record<string, DocumentAudience> = {
    person: 'privatperson',
    employer: 'arbeidsgiver',
    provider: 'samarbeidspartner',
    other: 'andre',
} as const;

const AUDIENCE_DEFAULT = audienceMap.person;

class ExternalSearchDocumentBuilder {
    private readonly content: ContentNode;
    private readonly locale: string;
    private readonly searchConfig: SearchConfig;

    private readonly contentGroupConfig: KeysConfig | null = null;

    constructor(content: ContentNode, locale: string, searchConfig: SearchConfig) {
        this.content = content;
        this.locale = locale;
        this.searchConfig = searchConfig;

        const contentGroupConfig = forceArray(searchConfig.data.contentGroups).find((group) =>
            forceArray(group.contentTypes).some((contentType) => contentType === content.type)
        )?.groupKeys;

        if (contentGroupConfig) {
            this.contentGroupConfig = contentGroupConfig as KeysConfig;
        }
    }

    public build(): ExternalSearchDocument | null {
        const content = this.content;
        const locale = this.locale;

        const href = getSearchNodeHref(content, locale);
        if (!href) {
            return null;
        }

        const title = this.getTitle();
        if (!title) {
            return null;
        }

        return {
            id: generateSearchDocumentId(content._id, locale),
            href,
            title,
            ingress: this.getIngress(),
            text: this.getText(),
            keywords: forceArray(content.data.keywords),
            metadata: {
                audience: this.getAudience(),
                language: this.getLanguage(),
                fylke: this.getFylke(),
                metatags: this.getMetaTags(),
                isFile: isMedia(content),
                createdAt: content.createdTime,
                lastUpdated: content.modifiedTime,
            },
        };
    }

    private getFieldValue(key: MetaKey) {
        const possibleKeys = this.getKeys(key);

        for (const key in possibleKeys) {
            const value = getNestedValue(this.content, key);
            if (value) {
                return value;
            }
        }

        return null;
    }

    private getKeys(metaKey: MetaKey) {
        const keys: string[] = [];

        if (this.contentGroupConfig) {
            const contentConfigKeys = forceArray(this.contentGroupConfig[metaKey]);
            keys.push(...contentConfigKeys);
        }

        if (metaKey !== 'textKey') {
            const defaultConfigKeys = forceArray(this.searchConfig.data.defaultKeys[metaKey]);
            keys.push(...defaultConfigKeys);
        }

        return keys.filter(Boolean);
    }

    private getText(): string {
        const keys = this.getKeys('textKey');

        return '';
    }

    private getTitle(): string | null {
        const title = this.getFieldValue('titleKey');
        return typeof title === 'string' ? title : null;
    }

    private getIngress(): string {
        const ingress = this.getFieldValue('ingressKey');
        return typeof ingress === 'string' ? ingress : '';
    }

    private getAudience(): DocumentAudience[] {
        const audienceValue = this.getFieldValue('audienceKey');
        if (!audienceValue) {
            return [AUDIENCE_DEFAULT];
        }

        return forceArray(audienceValue).map((audience) => audienceMap[audience]);
    }

    private getMetaTags() {
        const { type, _path, data } = this.content;

        const metaTags: DocumentMetaTag[] = [];

        if (type === 'no.nav.navno:office-branch') {
            metaTags.push('kontor');
        } else if (type === 'no.nav.navno:form-details') {
            metaTags.push('skjema');
        } else if (type === 'no.nav.navno:main-article') {
            if (data.contentType === 'news') {
                metaTags.push('nyhet');
            } else if (data.contentType === 'pressRelease') {
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
    }

    private getFylke() {
        return this.content._path.match(/\/content\/www\.nav\.no\/no\/lokalt\/(([a-z]|-)+)/)?.[1];
    }

    private getLanguage() {
        return this.content.language === 'no' ? 'nb' : this.content.language;
    }
}

export const buildExternalSearchDocument = (
    content: ContentNode,
    locale: string,
    searchConfig: SearchConfig
): ExternalSearchDocument | null => {
    if (!content?.data) {
        return null;
    }

    return new ExternalSearchDocumentBuilder(content, locale, searchConfig).build();
};
