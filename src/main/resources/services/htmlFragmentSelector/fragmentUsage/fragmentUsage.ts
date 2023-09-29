import * as contentLib from '/lib/xp/content';
import { findContentsWithText } from '../../../lib/utils/htmlarea-utils';
import { dependenciesCheckHandler } from '../../../lib/references/custom-dependencies-check';

const findContentsWithFragmentComponent = (fragmentId: string) => {
    return contentLib.query({
        start: 0,
        count: 1000,
        filters: {
            boolean: {
                must: {
                    hasValue: {
                        field: 'components.fragment.id',
                        values: [fragmentId],
                    },
                },
            },
        },
    }).hits;
};

const findContentsWithFragmentMacro = (fragmentId: string) => {
    return findContentsWithText(`html-fragment fragmentId=\\"${fragmentId}\\"`);
};

export const getFragmentUsageService = (req: XP.CustomSelectorServiceRequest) => {
    return dependenciesCheckHandler({
        req,
        componentsResolver: findContentsWithFragmentComponent,
        macrosResolver: findContentsWithFragmentMacro,
    });
};
