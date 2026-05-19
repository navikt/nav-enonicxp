import * as contentLib from '/lib/xp/content';
import thymeleafLib from '/lib/thymeleaf';
import { runInContext } from '../../../lib/context/run-in-context';

const view = resolve('./dashboard.html');

const dashboardInfo = () => {
    const content = runInContext({ branch: 'master' }, () =>
        contentLib.query({
            count: 100,
            contentTypes: ['no.nav.navno:announcement-to-editors'],
            sort: 'createdTime DESC',
        })
    ).hits[0];

    if (content) {
        const { displayName, data } = content;

        const { text } = data;
        const model = { displayName, text };

        return {
            body: thymeleafLib.render(view, model),
            contentType: 'text/html; charset=UTF-8',
        };
    }
    return {
        body: null,
        contentType: 'text/html; charset=UTF-8',
    };
};

export const get = dashboardInfo;
