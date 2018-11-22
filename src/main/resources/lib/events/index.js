var events = require('/lib/xp/event');
var eventListeners = {};

module.exports = {
    registerListener: registerListener
};

events.listener({
    type: '*',
    localOnly: false,
    callback: function (event) {
        if (eventListeners.hasOwnProperty(event.type)) {
            eventListeners[event.type].forEach(function (listener) {
                listener(event);
            })
        }
    }
});

function registerListener(event, listener) {
    if (!eventListeners.hasOwnProperty(event)) {
        eventListeners[event] = [];
    }
    eventListeners[event].push(listener);
}