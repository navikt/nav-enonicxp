import * as contentLib from '/lib/xp/content';
import * as taskLib from '/lib/xp/task';
import { Content } from '/lib/xp/content';
import { findContentsWithFragmentComponent } from '../../lib/utils/component-utils';
import { findContentsWithFragmentMacro } from '../../lib/utils/htmlarea-utils';
import { getServiceRequestSubPath } from '../service-utils';
import { runInContext } from '../../lib/context/run-in-context';
import { CONTENT_LOCALE_DEFAULT, CONTENT_ROOT_REPO_ID } from '../../lib/constants';
import { validateServiceSecretHeader } from '../../lib/utils/auth-utils';
import { forceArray, removeDuplicates } from '../../lib/utils/array-utils';
import { logger } from '../../lib/utils/logging';

type FragmentContent = Content<'portal:fragment'>;

type FragmentMapData = {
    fragment: FragmentContent;
    contentIdsWithFragment: string[];
};

type ContentMapData = {
    content: Content;
    fragmentIdsInContent: string[];
};

type FragmentDataShort = ReturnType<typeof transformFragment>;

type LocaleScoreMap = Record<string, number>;

type LocaleCorrelation = { probableLocales: string[]; localeCorrelation: Record<string, number> };

type FragmentLocaleCorrelationMap = Record<
    string,
    { fragment: FragmentDataShort; scoreMap: LocaleScoreMap; correlations: LocaleCorrelation }
>;

const transformFragment = (content: FragmentContent) => ({
    _id: content._id,
    _path: content._path,
    displayName: content.displayName,
});

const findProbableLocales = (localeScoreMap: LocaleScoreMap): LocaleCorrelation => {
    const scoreSum = Object.values(localeScoreMap).reduce((acc, score) => {
        return acc + score;
    }, 0);

    const result = Object.entries(localeScoreMap).reduce<{
        highestLocaleCount: number;
        probaleLocales: string[];
        localeCorrelation: Record<string, number>;
    }>(
        (probableLocaleData, [locale, usageCountForLocale]) => {
            const { highestLocaleCount, localeCorrelation } = probableLocaleData;

            if (usageCountForLocale > highestLocaleCount) {
                probableLocaleData.highestLocaleCount = usageCountForLocale;
                probableLocaleData.probaleLocales = [locale];
            } else if (usageCountForLocale === highestLocaleCount) {
                probableLocaleData.probaleLocales.push(locale);
            }

            localeCorrelation[locale] = Math.round((usageCountForLocale / scoreSum) * 1000) / 10;

            return probableLocaleData;
        },
        {
            highestLocaleCount: 0,
            probaleLocales: [],
            localeCorrelation: {},
        }
    );

    return {
        probableLocales: result.probaleLocales,
        localeCorrelation: result.localeCorrelation,
    };
};

type FragmentConnections = {
    fragment: FragmentDataShort;
    connections: Record<string, number>;
};

type FragmentConnectionsFinal = {
    fragment: FragmentDataShort;
    connections: {
        fragment: FragmentDataShort;
        score: number;
    }[];
};

const getCorrelationScore = (
    defaultContentData: ContentMapData,
    localizedContentData: ContentMapData,
    localizedFragmentId: string
): { fragmentId: string; score: number } => {
    const { fragmentIdsInContent: fragmentIdsInDefaultContent, content: defaultContent } =
        defaultContentData;

    const { fragmentIdsInContent: fragmentIdsInLocalizedContent, content: localizedContent } =
        localizedContentData;

    const localizedContentStringified = JSON.stringify(localizedContent);
    const defaultContentStringified = JSON.stringify(defaultContent);

    if (fragmentIdsInDefaultContent.length === fragmentIdsInLocalizedContent.length) {
        const sortedLocalizedFragments = fragmentIdsInLocalizedContent.sort((a, b) => {
            return localizedContentStringified.indexOf(a) - localizedContentStringified.indexOf(b);
        });
        const sortedDefaultFragments = fragmentIdsInDefaultContent.sort((a, b) => {
            return defaultContentStringified.indexOf(a) - defaultContentStringified.indexOf(b);
        });

        const localizedFragmentIndex = sortedLocalizedFragments.indexOf(localizedFragmentId);

        return {
            score: 100,
            fragmentId: sortedDefaultFragments[localizedFragmentIndex],
        };
    }

    const localizedFragmentIndex = localizedContentStringified.indexOf(localizedFragmentId);

    const closestDefaultFragmentIndex = fragmentIdsInDefaultContent.reduce<{
        diff?: number;
        fragmentId: string;
    }>(
        (acc, defaultFragmentId) => {
            const defaultFragmentIndex = defaultContentStringified.indexOf(defaultFragmentId);

            const diff = Math.abs(defaultFragmentIndex - localizedFragmentIndex);
            if (acc.diff === undefined || diff < acc.diff) {
                return {
                    diff,
                    fragmentId: defaultFragmentId,
                };
            }

            return acc;
        },
        { fragmentId: '' }
    );

    const score = closestDefaultFragmentIndex.diff
        ? (1 / closestDefaultFragmentIndex.diff) * 100
        : 0;

    return {
        score,
        fragmentId: closestDefaultFragmentIndex.fragmentId,
    };
};

const findPossibleConnections = (
    fragmentIds: string[],
    fragmentMap: Record<string, FragmentMapData>,
    contentMap: Record<string, ContentMapData>
) => {
    return fragmentIds.reduce<FragmentConnectionsFinal[]>((acc, localizedFragmentId) => {
        const fragmentData = fragmentMap[localizedFragmentId];
        const { fragment, contentIdsWithFragment } = fragmentData;

        const connections = contentIdsWithFragment.reduce<FragmentConnections['connections']>(
            (acc, contentId) => {
                const localizedContentData = contentMap[contentId];
                const { content: localizedContent } = localizedContentData;

                const languages = forceArray((localizedContent.data as any)?.languages);

                const defaultContentData =
                    languages.reduce<ContentMapData | null>((acc, languageContentId) => {
                        const referencedContent = contentMap[languageContentId];
                        if (referencedContent?.content.language === CONTENT_LOCALE_DEFAULT) {
                            return referencedContent;
                        }
                        return acc;
                    }, null) ||
                    Object.values(contentMap).find((contentData) => {
                        return forceArray((contentData.content.data as any)?.languages).some(
                            (languageContentId) => {
                                return (
                                    languageContentId === contentId &&
                                    contentData.content.language === CONTENT_LOCALE_DEFAULT
                                );
                            }
                        );
                    });

                if (!defaultContentData) {
                    return acc;
                }

                if (defaultContentData.content.type !== localizedContentData.content.type) {
                    return acc;
                }

                const { score, fragmentId } = getCorrelationScore(
                    defaultContentData,
                    localizedContentData,
                    localizedFragmentId
                );

                if (!acc[fragmentId]) {
                    acc[fragmentId] = 0;
                }

                acc[fragmentId] += score;

                return acc;
            },
            {}
        );

        const connectionsFinal = Object.entries(connections).reduce<
            FragmentConnectionsFinal['connections']
        >((acc, [fragmentId, score]) => {
            acc.push({ score, fragment: transformFragment(fragmentMap[fragmentId].fragment) });

            return acc;
        }, []);

        acc.push({ connections: connectionsFinal, fragment: transformFragment(fragment) });

        return acc;
    }, []);
};

const getLocaleCorrelation = () => {
    const allFragments = contentLib.query({ count: 2000, contentTypes: ['portal:fragment'] }).hits;

    const fragmentMap = allFragments.reduce<Record<string, FragmentMapData>>((acc, fragment) => {
        acc[fragment._id] = {
            fragment,
            contentIdsWithFragment: [],
        };
        return acc;
    }, {});

    const contentMap: Record<string, ContentMapData> = {};

    allFragments.forEach((fragment) => {
        const fragmentId = fragment._id;

        const contentWithFragment = removeDuplicates(
            [
                ...findContentsWithFragmentMacro(fragmentId),
                ...findContentsWithFragmentComponent(fragmentId),
            ],
            (a, b) => a._id === b._id
        );

        fragmentMap[fragmentId].contentIdsWithFragment = contentWithFragment.map(
            (content) => content._id
        );

        contentWithFragment.forEach((content) => {
            const contentId = content._id;

            if (!contentMap[contentId]) {
                contentMap[contentId] = {
                    content,
                    fragmentIdsInContent: [],
                };
            }

            contentMap[contentId].fragmentIdsInContent.push(fragmentId);
        });
    });

    const fragmentLocaleCorrelationDataMap = Object.values(
        contentMap
    ).reduce<FragmentLocaleCorrelationMap>((acc, contentData) => {
        const { content, fragmentIdsInContent } = contentData;
        const { language } = content;

        fragmentIdsInContent.forEach((fragmentId) => {
            if (!acc[fragmentId]) {
                acc[fragmentId] = {
                    fragment: transformFragment(fragmentMap[fragmentId].fragment),
                    scoreMap: {},
                    correlations: { localeCorrelation: {}, probableLocales: [] },
                };
            }

            const scoreMap = acc[fragmentId].scoreMap;
            if (!scoreMap[language]) {
                scoreMap[language] = 0;
            }

            scoreMap[language]++;
        });

        return acc;
    }, {});

    Object.values(fragmentLocaleCorrelationDataMap).forEach((localeScoreMap) => {
        localeScoreMap.correlations = findProbableLocales(localeScoreMap.scoreMap);
    });

    const fragmentIdLocaleBuckets = allFragments.reduce<Record<string, string[]>>(
        (acc, fragment) => {
            const fragmentId = fragment._id;

            const correlationData = fragmentLocaleCorrelationDataMap[fragmentId];
            if (!correlationData) {
                acc.undetermined.push(fragmentId);
                return acc;
            }

            const { probableLocales } = correlationData.correlations;
            if (probableLocales.length > 1) {
                acc.multiple.push(fragmentId);
                return acc;
            }

            const localeKey = probableLocales[0];
            if (!localeKey) {
                acc.undetermined.push(fragmentId);
                return acc;
            }

            if (!acc[localeKey]) {
                acc[localeKey] = [];
            }

            acc[localeKey].push(fragmentId);

            return acc;
        },
        { undetermined: [], multiple: [] }
    );

    const nnLikelyConnections = findPossibleConnections(
        fragmentIdLocaleBuckets.nn,
        fragmentMap,
        contentMap
    );
    const enLikelyConnections = findPossibleConnections(
        fragmentIdLocaleBuckets.en,
        fragmentMap,
        contentMap
    );

    const undeterminedFragments = fragmentIdLocaleBuckets.undetermined.map((fragmentId) =>
        transformFragment(fragmentMap[fragmentId].fragment)
    );

    return {
        fragmentLocaleCorrelationDataMap,
        nnLikelyConnections,
        enLikelyConnections,
        undeterminedFragments,
    };
};

const result = {
    start: 0,
    data: {},
    end: 0,
};

export const get = (req: XP.CustomSelectorServiceRequest) => {
    if (!validateServiceSecretHeader(req)) {
        return {
            status: 401,
        };
    }

    const subPath = getServiceRequestSubPath(req);

    return runInContext(
        { branch: 'draft', repository: CONTENT_ROOT_REPO_ID, asAdmin: true },
        () => {
            if (subPath === 'runJob') {
                taskLib.executeFunction({
                    func: () => {
                        logger.info('Running locale correlation job!');

                        result.start = Date.now();
                        result.data = getLocaleCorrelation();
                        result.end = Date.now();

                        logger.info(
                            `Locale correlation job finished after ${
                                (result.end - result.start) / 1000
                            } seconds!`
                        );
                    },
                    description: 'Determining fragment localization data',
                });
                return {
                    status: 200,
                    body: {
                        msg: 'Running job!',
                    },
                    contentType: 'application/json',
                };
            }

            return {
                status: 200,
                body: result,
                contentType: 'application/json',
            };
        }
    );
};
