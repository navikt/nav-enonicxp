import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import { logger } from '../../utils/logging';
import { ArrayOrSingle } from '../../../types/util-types';
import { forceArray } from '../../utils/array-utils';
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
                            exists: {
                                field: 'data.languages',
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
        .hits.reduce<{ sourceContent: Content; targetBaseContent: Content }[]>(
            (acc, sourceContent) => {
                const languageVersionIds = forceArray(
                    (sourceContent.data as { languages: ArrayOrSingle<string> }).languages
                );

                const validBaseLanguageVersions = languageVersionIds.reduce<Content[]>(
                    (acc, versionContentId) => {
                        const content = contentLib.get({ key: versionContentId });
                        return content?.language === sourceLocale ? [...acc, content] : acc;
                    },
                    []
                );

                if (validBaseLanguageVersions.length === 1) {
                    acc.push({
                        sourceContent: sourceContent,
                        targetBaseContent: validBaseLanguageVersions[0],
                    });
                } else if (validBaseLanguageVersions.length > 1) {
                    logger.error(
                        `Multiple base locale versions found for [${sourceLocale}] ${
                            sourceContent._path
                        } - ${JSON.stringify(
                            validBaseLanguageVersions.map((content) => content._path)
                        )}`
                    );
                }

                return acc;
            },
            []
        );

export const migrateContentBatchToLayers = (params: Params) =>
    runInLocaleContext({ locale: params.sourceLocale, branch: 'draft' }, () => {
        logger.info(`Running migration batch job with params: ${JSON.stringify(params)}`);

        const { sourceLocale, targetLocale } = params;

        const batchResult: MigrationResult[] = [];

        const contentToMigrate = getContentToMigrate(params);

        if (contentToMigrate.length === 0) {
            batchResult.push({ msg: 'No applicable content found for migrating', errors: [] });
            return batchResult;
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

        contentToMigrate.forEach(({ sourceContent, targetBaseContent }) => {
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
            }
        });

        toggleCacheInvalidationOnNodeEvents({ shouldDefer: false });

        return batchResult;
    });
