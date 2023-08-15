import * as contentLib from '/lib/xp/content';
import thymeleafLib from '/lib/thymeleaf';
import { runInContext } from "lib/context/run-in-context";

const announcementId = '/www.nav.no/admin/announcement';
const view = resolve('./dashboard.html');

const dashboardInfo = () => {
    const content = runInContext({ branch: 'master' }, () =>
        contentLib.get<any>({key: announcementId})
    );

    log.info(JSON.stringify(content, null, 4));

    if (content && content.type === 'no.nav.navno:announcement-to-editors') {
        const { displayName, text } = content.data;
        const model = { displayName, text};

        return {
            body: thymeleafLib.render(view, model),
            contentType: 'text/html',
        };
    }
    return {
        body: null
    }
};

exports.get = dashboardInfo;
