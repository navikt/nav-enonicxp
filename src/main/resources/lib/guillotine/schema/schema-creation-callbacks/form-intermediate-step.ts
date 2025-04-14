import { CreationCallback } from '../../utils/creation-callback-utils';
import { insertOriginalContentTypeField } from './common/original-content-type';
import { logger } from '../../../../lib/utils/logging';
import * as contentLib from '/lib/xp/content';
import { runInLocaleContext } from '../../../../lib/localization/locale-context';

export const formIntermediateStepCallback: CreationCallback = (context, params) => {
    insertOriginalContentTypeField(params);

    params.fields.data.resolve = (env) => {
        logger.info(`Current layer content: ${JSON.stringify(env.source, null, 2)}`);

        const noContent = runInLocaleContext({ locale: 'no' }, () =>
            contentLib.get({ key: env.source._id })
        );
        logger.info(`Norwegian layer content: ${JSON.stringify(noContent, null, 2)}`);
    };
};
