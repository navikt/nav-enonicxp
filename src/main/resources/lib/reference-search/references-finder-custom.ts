import { Content } from '/lib/xp/content';
import { CONTENT_STUDIO_PATH_PREFIX } from '../constants';
import { getLayersData } from '../localization/layers-data';
import { getContentProjectIdFromRepoId } from '../utils/repo-utils';
import { forceArray } from '../utils/array-utils';
import { runInLocaleContext } from '../localization/locale-context';
import { getContentFromAllLayers, isContentLocalized } from '../localization/locale-utils';
import { RepoBranch } from '../../types/common';

type ContentWithLocale = {
    content: Content;
    locale: string;
};

type ReferenceItem = {
    name: string;
    path: string;
    editorPath: string;
    id: string;
    layer: string;
};

type ReferenceType = 'general' | 'components' | 'macros';

type ReferencesResolver = (contentId: string, contentLayer: string) => Content[] | null;

export type ReferencesResolversMap = { [key in `${ReferenceType}Resolver`]?: ReferencesResolver };

const transformToReferenceItem = (content: Content, locale: string): ReferenceItem => {
    const { localeToRepoIdMap } = getLayersData();
    const projectId = getContentProjectIdFromRepoId(localeToRepoIdMap[locale]);

    return {
        name: content.displayName,
        path: content._path,
        editorPath: `${CONTENT_STUDIO_PATH_PREFIX}/${projectId}/edit/${content._id}`,
        id: content._id,
        layer: locale,
    };
};

const resolveWithInheritedContent = (
    resolver: () => Content | Content[] | null,
    contentId: string,
    locale: string,
    branch: RepoBranch = 'master'
): ContentWithLocale[] | null => {
    const { defaultLocale } = getLayersData();

    const result = runInLocaleContext({ locale, branch, asAdmin: true }, resolver);
    if (!result) {
        return null;
    }

    const initialLocaleResult = forceArray(result)
        .filter(isContentLocalized)
        .map((content) => ({ content, locale }));

    // If the locale is not the default (from which other layer locales inherit) we don't need to do anything else
    // For the default locale we also need to search for references from any inheriting contents
    if (locale !== defaultLocale) {
        return initialLocaleResult;
    }

    // We only need to check for references in the layers in which this content is not localized
    // If the content is localized, it will no longer be a dependent of the default content
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

            const localizedOnly = forceArray(inheritedResult)
                .filter(isContentLocalized)
                .map((content) => ({ content, locale: inheritedLocale }));

            acc.push(...localizedOnly);

            return acc;
        },
        initialLocaleResult
    );

    return layersResults;
};

const resolverRunner = (resolver: ReferencesResolver, contentId: string, contentLayer: string) => {
    const result = resolveWithInheritedContent(
        () => resolver(contentId, contentLayer),
        contentId,
        contentLayer
    );
    if (!result) {
        return null;
    }

    return result.map(({ content, locale }) => {
        return transformToReferenceItem(content, locale);
    });
};

type Params = {
    contentId: string;
    locale: string;
} & { [key in `${ReferenceType}Resolver`]?: ReferencesResolver };

// This is used to generate data for the custom references display in the editor-frontend.
// Allows for a more precise reference-search tailored for specific use-cases.
export const runCustomReferencesResolvers = ({
    contentId,
    locale,
    generalResolver,
    componentsResolver,
    macrosResolver,
}: Params) => {
    const results: { [key in ReferenceType]?: ReferenceItem[] } = {};

    if (generalResolver) {
        const result = resolverRunner(generalResolver, contentId, locale);
        if (!result) {
            return null;
        }

        results.general = result;
    }

    if (componentsResolver) {
        const result = resolverRunner(componentsResolver, contentId, locale);
        if (!result) {
            return null;
        }

        results.components = result;
    }

    if (macrosResolver) {
        const result = resolverRunner(macrosResolver, contentId, locale);
        if (!result) {
            return null;
        }

        results.macros = result;
    }

    return results;
};
