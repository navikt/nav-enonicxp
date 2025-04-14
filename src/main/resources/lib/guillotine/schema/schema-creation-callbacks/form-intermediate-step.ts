import { CreationCallback } from '../../utils/creation-callback-utils';
import { insertOriginalContentTypeField } from './common/original-content-type';
import { logger } from '../../../../lib/utils/logging';
import * as contentLib from '/lib/xp/content';
import { runInLocaleContext } from '../../../../lib/localization/locale-context';

export const formIntermediateStepCallback: CreationCallback = (context, params) => {
    insertOriginalContentTypeField(params);

    params.fields.data.resolve = (env) => {
        logger.info(`Current layer content: ${JSON.stringify(env.source.data.steps, null, 2)}`);

        // Modify the actual content
        contentLib.modify({
            key: env.source._id,
            editor: (node) => {
                if (!node.data.steps) {
                    node.data.steps = [];
                }
                node.data.steps.push({
                    label: 'Sample Step',
                    nextStep: {
                        _selected: 'external',
                        external: {
                            externalUrl: 'https://www.nav.no',
                        },
                    },
                });
                return node;
            },
        });

        return env.source.data;
    };
};
