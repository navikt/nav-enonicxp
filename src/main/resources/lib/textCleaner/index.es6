const libs = {
    event: require('/lib/xp/event'),
    context: require('/lib/xp/context'),
    content: require('/lib/xp/content'),
    // common: require('/lib/xp/common'),
};

let hasSetupListeners = false;

const cleanText = (nodeId, nodePath) => {
    const content = libs.content.get({
        key: nodeId,
    });
    if (!content) {
        return false;
    }
    if (content && content.data && content.data.text) {
        const text = content.data.text;
        // remove these chars:
        // U+202F	\xe2\x80\xaf	NARROW NO-BREAK SPACE
        const narrowBreakTest = /\u202F/g;
        if (narrowBreakTest.test(text)) {
            const modifiedText = text.replace(narrowBreakTest, ' ');
            libs.content.modify({
                key: nodeId,
                editor: contentElem => {
                    return { ...contentElem, data: { ...contentElem.data, text: modifiedText } };
                },
            });
        } else {
            log.info('no bad seeds found');
        }
    }
    return false;
};

function nodeListenerCallback(event) {
    event.data.nodes.forEach(node => {
        if (node.branch === 'draft' && node.repo === 'com.enonic.cms.default') {
            libs.context.run(
                {
                    repository: 'com.enonic.cms.default',
                    branch: 'draft',
                    user: {
                        login: 'su',
                        userStore: 'system',
                    },
                    principals: ['role:system.admin'],
                },
                () => {
                    cleanText(node.id, node.path, 0);
                }
            );
        }
    });
    return true;
}

function activateEventListener() {
    if (!hasSetupListeners) {
        libs.event.listener({
            type: 'node.updated',
            localOnly: false,
            callback: nodeListenerCallback,
        });
        hasSetupListeners = true;
    } else {
        log.info('text cleaner already started');
    }
}

module.exports = {
    activateEventListener,
};
