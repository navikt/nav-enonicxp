import * as contentLib from '/lib/xp/content';
import * as portalLib from '/lib/xp/portal';
import thymeleafLib from '/lib/thymeleaf';

const view = resolve('./dashboard.html');
const text = "Skal erstattes med en contentLib.get()"
const model = { text };
const dashboardInfo = () => {
    return {
        body: thymeleafLib.render(view, model),
        contentType: 'text/html',
    };
};

exports.get = dashboardInfo;
