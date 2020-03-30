const libs = {
    event: require('/lib/xp/event'),
    context: require('/lib/xp/context'),
    content: require('/lib/xp/content'),
};

let hasSetupListeners = false;

const cleanText = nodeId => {
    const content = libs.content.get({
        key: nodeId,
    });

    if (content && content.data && content.data.text) {
        const text = content.data.text;

        // Replace unicode char with space
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
        }
    }
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
                    cleanText(node.id);
                }
            );
        }
    });
    return true;
}

function activateEventListener() {
    if (!hasSetupListeners) {
        try {
            libs.event.listener({
                type: 'node.updated',
                localOnly: true,
                callback: nodeListenerCallback,
            });
            log.info('Started: textCleaner eventListener on node.updated');
            hasSetupListeners = true;
        } catch (e) {
            log.info('Failed to start: textCleaner eventListener on node.updated');
            log.error(e);
        }
    } else {
        log.info('Eventlistener textcleaner already started');
    }
}

module.exports = {
    activateEventListener,
};
