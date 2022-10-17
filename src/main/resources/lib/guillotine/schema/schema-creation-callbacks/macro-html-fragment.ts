import contentLib from '/lib/xp/content';
import graphQlLib from '/lib/graphql';
import macroLib from '/lib/guillotine/macro';
import { CreationCallback } from '../../utils/creation-callback-utils';
import { getKeyWithoutMacroDescription } from '../../../utils/component-utils';
import { HtmlAreaPartConfig } from '../../../../site/parts/html-area/html-area-part-config';
import { logger } from '../../../utils/logging';

export const macroHtmlFragmentCallback: CreationCallback = (context, params) => {
    params.fields.processedHtml = {
        type: graphQlLib.reference('RichText'),
        resolve: (env) => {
            const { fragmentId } = env.source;
            if (!fragmentId) {
                return null;
            }

            const key = getKeyWithoutMacroDescription(fragmentId);

            const content = contentLib.get({ key });
            if (!content) {
                logger.critical(
                    `Content not found for fragment in html-fragment macro: ${fragmentId}`,
                    true,
                    true
                );
                return null;
            }

            if (content.type !== 'portal:fragment') {
                logger.error(
                    `Content specified for html-fragment macro is not a fragment: ${fragmentId}`,
                    false,
                    true
                );
                return null;
            }

            const html = (content.fragment?.config as HtmlAreaPartConfig)?.html;
            if (!html) {
                logger.warning(
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
