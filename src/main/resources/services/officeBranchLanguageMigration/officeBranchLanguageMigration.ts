import * as contentLib from '/lib/xp/content';
import { runInContext } from '../../lib/context/run-in-context';

import { APP_DESCRIPTOR } from '../../lib/constants';

const getOfficeInfo = () => {
    const officeBranches = contentLib.query({
        start: 0,
        count: 1000,
        contentTypes: [`${APP_DESCRIPTOR}:office-branch`],
        query: `language = "nb"`,
    }).hits;

    officeBranches.forEach((officeBranch) => {
        contentLib.modify({
            key: officeBranch._id,
            editor: (content) => ({
                ...content,
                language: 'no',
            }),
        });

        contentLib.publish({
            keys: [officeBranch._id],
            sourceBranch: 'draft',
            targetBranch: 'master',
            includeDependencies: false,
        });
    });
};

export const get = () => {
    runInContext({ branch: 'draft', asAdmin: true }, () => {
        getOfficeInfo();
    });
    return {
        status: 202,
        contentType: 'application/json',
    };
};
