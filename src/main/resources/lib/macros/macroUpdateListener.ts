import * as eventLib from '/lib/xp/event';
import * as clusterLib from '/lib/xp/cluster';
import * as contentLib from '/lib/xp/content';

let didActivateListener = false;

export const activateMacroUpdateListener = () => {
    if (didActivateListener) {
        return;
    }

    didActivateListener = true;

    eventLib.listener({
        type: 'node.pushed',
        callback: (event) => {
            log.info('macroEvent');
            log.info(JSON.stringify(event, null, 2));

            const { id } = event.data.nodes[0];
            const content = contentLib.get({ key: id });
            log.info(JSON.stringify(content, null, 2));
        },
    });
};
