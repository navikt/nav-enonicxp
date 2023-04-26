import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import { logger } from '../../utils/logging';
import { ArrayOrSingle } from '../../../types/util-types';
import { forceArray, removeDuplicates } from '../../utils/array-utils';
import { runInLocaleContext } from '../locale-context';
import { migrateContentToLayer } from './migrate-content-to-layer';
import { ContentDescriptor } from '../../../types/content-types/content-config';
import { toggleCacheInvalidationOnNodeEvents } from '../../cache/invalidate-event-defer';

type Params = {
    sourceLocale: string;
    targetLocale: string;
    contentTypes: ContentDescriptor[];
    count: number;
    query?: string;
};

type MigrationResult = { msg: string; errors: string[] };

type SourceAndTargetContent = { sourceContent: Content; targetBaseContent: Content };

const getTargetBaseContentReverse = (sourceContent: Content, sourceLocale: string) => {
    return contentLib.query({
        count: 2,
        filters: {
            boolean: {
                must: [
                    {
                        hasValue: {
                            field: 'language',
                            values: [sourceLocale],
                        },
                    },
                    {
                        hasValue: {
                            field: 'data.languages',
                            values: [sourceContent._id],
                        },
                    },
                    {
                        notExists: {
                            field: 'x.no-nav-navno.layerMigration',
                        },
                    },
                ],
            },
        },
    }).hits;
};

const getTargetBaseContent = (sourceContent: Content, sourceLocale: string) => {
    const languageVersionIds = forceArray(
        (sourceContent.data as { languages: ArrayOrSingle<string> }).languages
    );

    const baseLanguageVersions = removeDuplicates(languageVersionIds).reduce<Content[]>(
        (acc, versionContentId) => {
            const content = contentLib.get({ key: versionContentId });
            return content?.language === sourceLocale ? [...acc, content] : acc;
        },
        []
    );

    if (baseLanguageVersions.length === 0) {
        logger.info(
            `No reference to base language version found on [${sourceLocale}] ${sourceContent._path}, trying reverse lookup`
        );
        const reverseLookupVersions = getTargetBaseContentReverse(sourceContent, sourceLocale);
        baseLanguageVersions.push(...reverseLookupVersions);
    }

    if (baseLanguageVersions.length === 1) {
        return baseLanguageVersions[0];
    } else if (baseLanguageVersions.length > 1) {
        logger.error(
            `Multiple base locale versions found for [${sourceLocale}] ${
                sourceContent._path
            } - ${JSON.stringify(baseLanguageVersions.map((content) => content._path))}`
        );
    }

    return null;
};

const getContentToMigrate = ({ contentTypes, query, count, sourceLocale, targetLocale }: Params) =>
    contentLib
        .query({
            count,
            query,
            contentTypes,
            filters: {
                boolean: {
                    must: [
                        {
                            hasValue: {
                                field: 'language',
                                values: [targetLocale],
                            },
                        },
                        {
                            notExists: {
                                field: 'x.no-nav-navno.layerMigration',
                            },
                        },
                    ],
                },
            },
        })
        .hits.reduce<SourceAndTargetContent[]>((acc, sourceContent) => {
            const targetBaseContent = getTargetBaseContent(sourceContent, sourceLocale);
            if (targetBaseContent) {
                acc.push({ sourceContent, targetBaseContent });
            }

            return acc;
        }, []);

export const migrateContentBatchToLayers = (params: Params) =>
    runInLocaleContext({ locale: params.sourceLocale, branch: 'draft' }, () => {
        logger.info(`Running migration batch job with params: ${JSON.stringify(params)}`);

        const { sourceLocale, targetLocale } = params;

        const contentToMigrate = getContentToMigrate(params);

        if (contentToMigrate.length === 0) {
            return { msg: 'No applicable content found for migrating', errors: [] };
        }

        logger.info(
            `Found ${contentToMigrate.length} content to migrate: ${JSON.stringify(
                contentToMigrate.map(
                    (content) =>
                        `${content.sourceContent._path} -> ${content.targetBaseContent._path}`
                ),
                null,
                4
            )}`
        );

        toggleCacheInvalidationOnNodeEvents({ shouldDefer: true });

        const result = contentToMigrate.map(({ sourceContent, targetBaseContent }) => {
            const result = migrateContentToLayer({
                sourceId: sourceContent._id,
                targetId: targetBaseContent._id,
                sourceLocale,
                targetLocale,
            });

            const contentResult: MigrationResult = {
                msg: `Migration from [${sourceLocale}] ${sourceContent._path} to [${targetLocale}] ${targetBaseContent._path}`,
                errors: [],
            };

            if (result.errorMsgs.length > 0) {
                contentResult.errors.push(...result.errorMsgs);
                logger.error(
                    `${contentResult.msg} completed with errors: ${result.errorMsgs.join(', ')}`
                );
            } else {
                logger.info(`${contentResult.msg} completed without errors`);
            }

            return contentResult;
        });

        toggleCacheInvalidationOnNodeEvents({ shouldDefer: false });

        return result;
    });
