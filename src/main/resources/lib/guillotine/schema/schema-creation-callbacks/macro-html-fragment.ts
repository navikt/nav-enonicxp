import * as contentLib from '/lib/xp/content';
import graphQlLib from '/lib/graphql';
import macroLib from '/lib/guillotine/macro';
import { CreationCallback } from '../../utils/creation-callback-utils';
import { getKeyWithoutMacroDescription } from '../../../utils/component-utils';
import { HtmlArea } from '@xp-types/site/parts/html-area';
import { logger } from '../../../utils/logging';
import { runInContext } from '../../../context/run-in-context';
import { getGuillotineContentQueryBaseContentId } from '../../utils/content-query-context';
import { isContentPreviewOnly } from '../../../utils/content-utils';
import { getLocaleFromContext } from '../../../localization/locale-context';

const getInvalidReferenceLogLevel = (baseContentId?: string) => {
    if (!baseContentId) {
        return 'critical';
    }

    const baseContent = contentLib.get({ key: baseContentId });
    if (!baseContent) {
        return 'critical';
    }

    return isContentPreviewOnly(baseContent) ? 'warning' : 'critical';
};

export const macroHtmlFragmentCallback: CreationCallback = (context, params) => {
    params.fields.processedHtml = {
        type: graphQlLib.reference('RichText'),
        resolve: (env) => {
            const { fragmentId } = env.source;
            if (!fragmentId) {
                return null;
            }

            const key = getKeyWithoutMacroDescription(fragmentId);

            const fragmentContent = runInContext({ branch: 'master' }, () =>
                contentLib.get({ key })
            );
            if (!fragmentContent) {
                const baseContentId = getGuillotineContentQueryBaseContentId();
                const locale = getLocaleFromContext();
                const logLevel = getInvalidReferenceLogLevel(baseContentId);

                logger[logLevel](
                    `Content not found for fragment in html-fragment macro: ${fragmentId} / [${locale}] ${baseContentId}`,
                    true,
                    true
                );
                return null;
            }

            if (fragmentContent.type !== 'portal:fragment') {
                logger.critical(
                    `Content specified for html-fragment macro is not a fragment: ${fragmentId}`,
                    false,
                    true
                );
                return null;
            }

            const html = (fragmentContent.fragment?.config as Partial<HtmlArea>)?.html;
            if (!html) {
                logger.error(
                    `Fragment in html-fragment macro did not contain html: ${fragmentId}`,
                    false,
                    true
                );
                return null;
            }

            return macroLib.processHtml({
                type: 'server',
                value: html,
            });
        },
    };
};
