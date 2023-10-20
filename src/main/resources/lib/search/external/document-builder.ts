import { Content } from '/lib/xp/content';
import { RepoNode } from '/lib/xp/node';
import { forceArray } from '../../utils/array-utils';
import { getSearchNodeHref } from '../create-or-update-search-node';
import { generateSearchDocumentId } from './utils';
import { isMedia } from '../../utils/content-utils';
import { getNestedValues } from '../../utils/object-utils';
import { getExternalSearchConfig } from './config';
import { logger } from '../../utils/logging';

type SearchConfig = Content<'no.nav.navno:search-config-v2'>;
type KeysConfig = Partial<SearchConfig['data']['defaultKeys']>;
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

type Fylke = (typeof FYLKER)[number];

export type ExternalSearchDocument = {
    id: string;
    href: string;
    title: string;
    ingress: string;
    text: string;
    metadata: {
        createdAt: string;
        lastUpdated: string;
        language: string;
        audience: DocumentAudience[];
        metatags?: DocumentMetaTag[];
        fylke?: Fylke;
        isFile?: boolean;
        keywords?: string[];
    };
};

const FYLKER = [
    'agder',
    'innlandet',
    'more-og-romsdal',
    'nordland',
    'oslo',
    'rogaland',
    'troms-og-finnmark',
    'trondelag',
    'vest-viken',
    'vestfold-og-telemark',
    'vestland',
    'ost-viken',
] as const;

const fylkerSet: ReadonlySet<string> = new Set(FYLKER);

const audienceMap: Record<string, DocumentAudience> = {
    person: 'privatperson',
    employer: 'arbeidsgiver',
    provider: 'samarbeidspartner',
    other: 'andre',
} as const;

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

    public build(): ExternalSearchDocument | null {
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
                audience: this.getAudience(),
                language: this.getLanguage(),
                fylke: this.getFylke(),
                metatags: this.getMetaTags(),
                isFile: isMedia(content),
                createdAt: content.createdTime,
                lastUpdated: content.modifiedTime,
                keywords: forceArray(content.data.keywords),
            },
        };
    }

    private getFieldValues(metaKey: MetaKey, mode: 'first' | 'all') {
        const possibleKeys = this.getKeys(metaKey);

        const values: string[] = [];

        for (const key of possibleKeys) {
            const value = getNestedValues(this.content, key);
            if (!value) {
                continue;
            }

            if (Array.isArray(value)) {
                values.push(...value.filter((item) => typeof item === 'string'));
            } else if (typeof value === 'string') {
                values.push(value);
            } else {
                continue;
            }

            if (mode === 'first') {
                break;
            }
        }

        return values;
    }

    private getKeys(metaKey: MetaKey) {
        const keys: string[] = [];

        if (this.contentGroupKeys) {
            const contentConfigKeys = forceArray(this.contentGroupKeys[metaKey]);
            keys.push(...contentConfigKeys);
        }

        if (metaKey !== 'textKey') {
            const defaultConfigKeys = forceArray(this.searchConfig.data.defaultKeys[metaKey]);
            keys.push(...defaultConfigKeys);
        }

        return keys.filter(Boolean);
    }

    private getText(): string {
        return this.getFieldValues('textKey', 'all').join(' ');
    }

    private getTitle(): string | null {
        const title = this.getFieldValues('titleKey', 'first')[0];
        return title || null;
    }

    private getIngress(): string {
        const ingress = this.getFieldValues('ingressKey', 'first')[0];
        return ingress || '';
    }

    private getAudience(): DocumentAudience[] {
        const audienceValue = this.getFieldValues('audienceKey', 'first');
        if (audienceValue.length === 0) {
            return [audienceMap.person];
        }

        return audienceValue.map((audience) => audienceMap[audience]);
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
        const fylke = this.content._path.match(
            /\/content\/www\.nav\.no\/no\/lokalt\/(([a-z]|-)+)/
        )?.[1] as Fylke | undefined;

        return fylke && fylkerSet.has(fylke) ? fylke : undefined;
    }

    private getLanguage() {
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
): ExternalSearchDocument | null => {
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
