import * as contentLib from '/lib/xp/content';
import graphQlLib from '/lib/graphql';
import macroLib from '/lib/guillotine/macro';
import { CreationCallback } from '../../utils/creation-callback-utils';
import { getKeyWithoutMacroDescription } from '../../../utils/component-utils';
import { HtmlAreaPartConfig } from '../../../../site/parts/html-area/html-area-part-config';
import { logger } from '../../../utils/logging';
import { runInContext } from '../../../context/run-in-context';
import { getGuillotineContentQueryBaseContentId } from '../../utils/content-query-context';
import { isContentPreviewOnly } from '../../../utils/content-utils';

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
                if (baseContentId) {
                    const baseContent = contentLib.get({ key: baseContentId });
                    if (!baseContent || isContentPreviewOnly(baseContent)) {
                        return null;
                    }
                }

                logger.critical(
                    `Content not found for fragment in html-fragment macro: ${fragmentId}`,
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

            const html = (fragmentContent.fragment?.config as HtmlAreaPartConfig)?.html;
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
