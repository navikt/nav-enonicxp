import contentLib, { Content } from '/lib/xp/content';
import { logger } from '../../../utils/logging';
import { CreationCallback } from '../../utils/creation-callback-utils';
import { insertOriginalContentTypeField } from './common/original-content-type';

export const internalLinkDataCallback: CreationCallback = (context, params) => {
    const getTarget = (contentId: string, count: number): Content | null => {
        count++;
        if (count > 10) {
            logger.critical(
                `internalLinkCallback: Max depth (10)/redirect loop - ContentId=${contentId}`
            );
            return null;
        }
        if (!contentId) {
            return null;
        }

        let content = contentLib.get({ key: contentId });
        if (!content) {
            return null;
        }

        // Keep following internal-links to get final target
        if (content.type === 'no.nav.navno:internal-link') {
            if (!content.data.target) {
                return null;
            }
            content = getTarget(content.data.target, count);
        }
        return content;
    };

    // Resolve final target
    params.fields.target.resolve = (env) => {
        const { target, _path } = env.source;
        if (!target) {
            logger.error(`internalLinkCallback: No valid target provided for path=${_path}`);
            return null;
        }
        const content = getTarget(target, 0);
        if (!content) {
            logger.content(`internalLinkCallback: Content not found for path=${_path}`);
            return null;
        }
        return content;
    };
};

export const internalLinkCallback: CreationCallback = (context, params) => {
    insertOriginalContentTypeField(params);
};
