import * as contentLib from '/lib/xp/content';
import { findContentsWithText } from '../../utils/htmlarea-utils';

export const findContentsWithFragmentComponent = (fragmentId: string) => {
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

export const findContentsWithFragmentMacro = (fragmentId: string) => {
    return findContentsWithText(`html-fragment fragmentId=\\"${fragmentId}\\"`);
};
