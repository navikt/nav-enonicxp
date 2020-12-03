/* eslint-disable */
const graphqlPlaygroundLib = require('/lib/graphql-playground');
const graphQlLib = require('/lib/graphql');
const graphQlRxLib = require('/lib/graphql-rx');
const webSocketLib = require('/lib/xp/websocket');
const { guillotineSchema } = require('/lib/headless/guillotine/guillotine-query');
const { env } = app.config;

const graphQlSubscribers = {};

const cancelSubscription = (sessionId) => {
    Java.synchronized(() => {
        const subscriber = graphQlSubscribers[sessionId];
        if (subscriber) {
            delete graphQlSubscribers[sessionId];
            subscriber.cancelSubscription();
        }
    }, graphQlSubscribers)();
};

const handleStartMessage = (sessionId, message) => {
    const graphlqlOperationId = message.id;
    const { query, variables } = message.payload;

    try {
        const result = graphQlLib.execute(guillotineSchema, query, variables);

        if (result.data instanceof com.enonic.lib.graphql.rx.Publisher) {
            const subscriber = graphQlRxLib.createSubscriber({
                onNext: (result) => {
                    webSocketLib.send(
                        sessionId,
                        JSON.stringify({
                            type: 'data',
                            id: graphlqlOperationId,
                            payload: result,
                        })
                    );
                },
            });
            Java.synchronized(
                () => (graphQlSubscribers[sessionId] = subscriber),
                graphQlSubscribers
            )();
            result.data.subscribe(subscriber);
        }
    } catch (e) {
        log.error('Error while handling Start GraphQL-WS message', e);
        throw e;
    }
};

exports.get = (req) => {
    if (env === 'p') {
        return {
            status: 403,
        };
    }

    if (req.webSocket) {
        return {
            webSocket: {
                subProtocols: ['graphql-ws'],
            },
        };
    }

    return {
        contentType: 'text/html; charset=utf-8',
        body: graphqlPlaygroundLib.render(),
    };
};

exports.post = (req) => {
    if (env === 'p') {
        return {
            status: 403,
        };
    }

    const { query, variables } = JSON.parse(req.body);
    const response = graphQlLib.execute(guillotineSchema, query, variables);

    return {
        contentType: 'application/json',
        body: JSON.stringify(response),
    };
};

exports.webSocketEvent = (event) => {
    switch (event.type) {
        case 'close':
            cancelSubscription(event.session.id);
            break;
        case 'message':
            const message = JSON.parse(event.message);
            switch (message.type) {
                case 'connection_init':
                    webSocketLib.send(
                        event.session.id,
                        JSON.stringify({
                            type: 'connection_ack',
                        })
                    );
                    break;
                case 'start':
                    handleStartMessage(event.session.id, message);
                    break;
                case 'stop':
                    cancelSubscription(event.session.id);
                    break;
            }
            break;
        case 'error':
            log.warning('Session [' + event.session.id + '] error: ' + event.error);
            break;
    }
};
