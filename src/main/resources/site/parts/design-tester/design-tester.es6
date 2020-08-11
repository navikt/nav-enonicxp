const portal = require('/lib/xp/portal');
const React4xp = require('/lib/enonic/react4xp');

exports.get = function (request) {
    const component = portal.getComponent();

    const clientRender = !component.config.SSR;

    return React4xp.render('Designer', {}, request, { clientRender });
};
