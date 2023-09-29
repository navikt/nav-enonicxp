import { Content } from '/lib/xp/content';
import { CONTENT_STUDIO_PATH_PREFIX } from '../constants';
import { getLayersData, isValidLocale } from '../localization/layers-data';
import { getContentProjectIdFromRepoId } from '../utils/repo-utils';
import { forceArray } from '../utils/array-utils';
import { runInLocaleContext } from '../localization/locale-context';
import { getContentFromAllLayers, isContentLocalized } from '../localization/locale-utils';
import { RepoBranch } from '../../types/common';

type ReqParams = Partial<{
    contentId: string;
    locale: string;
}>;

type DependencyItem = {
    name: string;
    path: string;
    editorPath: string;
    id: string;
};

export type ContentWithLocale = {
    content: Content;
    locale: string;
};

type DependencyType = 'general' | 'components' | 'macros';

type DependenciesResolver = (contentId: string, contentLayer: string) => Content[] | null;

type HandlerParams = {
    req: XP.Request;
} & { [key in `${DependencyType}Resolver`]?: DependenciesResolver };

const transformToDependencyItem = (content: Content, locale: string): DependencyItem => {
    const { defaultLocale, localeToRepoIdMap } = getLayersData();
    const projectId = getContentProjectIdFromRepoId(localeToRepoIdMap[locale]);

    return {
        name: `${locale !== defaultLocale ? `(Layer: ${locale}) ` : ''}${content.displayName}`,
        path: content._path,
        editorPath: `${CONTENT_STUDIO_PATH_PREFIX}/${projectId}/edit/${content._id}`,
        id: content._id,
    };
};

type Params = { contentId: string; locale: string; branch: RepoBranch };

const resolveWithInheritedContent = (
    { contentId, branch, locale }: Params,
    resolver: () => Content | Content[] | null
): ContentWithLocale[] | null => {
    const { defaultLocale } = getLayersData();

    const result = runInLocaleContext({ locale, branch, asAdmin: true }, resolver);
    if (!result) {
        return null;
    }

    const initialLocaleResult = forceArray(result)
        .filter(isContentLocalized)
        .map((content) => ({ content, locale }));

    if (locale !== defaultLocale) {
        return initialLocaleResult;
    }

    const nonLocalizedInheritedLocales = getContentFromAllLayers({
        contentId,
        branch,
        state: 'nonlocalized',
    }).map((content) => content.locale);

    const layersResults = nonLocalizedInheritedLocales.reduce<ContentWithLocale[]>(
        (acc, inheritedLocale) => {
            const inheritedResult = runInLocaleContext(
                { locale: inheritedLocale, branch, asAdmin: true },
                resolver
            );
            if (!inheritedResult) {
                return acc;
            }

            const filteredResult = forceArray(inheritedResult)
                .filter(isContentLocalized)
                .map((content) => ({ content, locale: inheritedLocale }));

            acc.push(...filteredResult);

            return acc;
        },
        initialLocaleResult
    );

    return layersResults;
};

const resolverRunner = (
    resolver: DependenciesResolver,
    contentId: string,
    contentLayer: string
) => {
    const result = resolveWithInheritedContent(
        { contentId, locale: contentLayer, branch: 'master' },
        () => resolver(contentId, contentLayer)
    );
    if (!result) {
        return null;
    }

    return result.map(({ content, locale }) => {
        return transformToDependencyItem(content, locale);
    });
};

export const dependenciesCheckHandler = ({
    req,
    generalResolver,
    componentsResolver,
    macrosResolver,
}: HandlerParams) => {
    const { contentId, locale } = req.params as ReqParams;

    if (!contentId || !isValidLocale(locale)) {
        return {
            status: 400,
            body: {
                message: `Invalid parameters for dependencies check (id: ${contentId} - layer: ${locale})`,
            },
        };
    }

    const body: { [key in DependencyType]?: DependencyItem[] } = {};

    let success = true;

    if (generalResolver) {
        const result = resolverRunner(generalResolver, contentId, locale);
        if (result) {
            body.general = result;
        } else {
            success = false;
        }
    }

    if (componentsResolver) {
        const result = resolverRunner(componentsResolver, contentId, locale);
        if (result) {
            body.components = result;
        } else {
            success = false;
        }
    }

    if (macrosResolver) {
        const result = resolverRunner(macrosResolver, contentId, locale);
        if (result) {
            body.macros = result;
        } else {
            success = false;
        }
    }

    if (!success) {
        return {
            status: 500,
            contentType: 'application/json',
            body: {
                message: `Something went wrong while resolving dependencies for [${locale}] ${contentId}, check logs for details!`,
            },
        };
    }

    return {
        status: 200,
        contentType: 'application/json',
        body,
    };
};
