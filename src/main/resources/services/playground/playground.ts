import graphqlPlaygroundLib from '/lib/graphql-playground';
import graphQlLib from '/lib/graphql';
// @ts-ignore
import graphQlRxLib from '/lib/graphql-rx';
import webSocketLib from '/lib/xp/websocket';
import { schema } from '../../lib/guillotine/schema/schema';
import { urls } from '../../lib/constants';

const isProd = app.config.env === 'p';

const graphQlSubscribers: Record<string, any> = {};

const cancelSubscription = (sessionId: string) => {
    Java.synchronized(() => {
        const subscriber = graphQlSubscribers[sessionId];
        if (subscriber) {
            delete graphQlSubscribers[sessionId];
            subscriber.cancelSubscription();
        }
    }, graphQlSubscribers)();
};

const handleStartMessage = (sessionId: string, message: any) => {
    const graphlqlOperationId = message.id;
    const { query, variables } = message.payload;

    try {
        const result = graphQlLib.execute(schema, query, variables);

        // @ts-ignore
        if (result.data instanceof com.enonic.lib.graphql.rx.Publisher) {
            const subscriber = graphQlRxLib.createSubscriber({
                onNext: (result: any) => {
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

export const get = (req: XP.Request) => {
    if (isProd) {
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

    const html = graphqlPlaygroundLib
        .render()
        .replace(/^".*\/_\/asset/g, `${urls.xpOrigin}/_/asset`);

    return {
        contentType: 'text/html; charset=utf-8',
        body: html,
    };
};

export const post = (req: XP.Request) => {
    if (isProd) {
        return {
            status: 403,
        };
    }

    const { query, variables } = JSON.parse(req.body);
    const response = graphQlLib.execute(schema, query, variables);

    return {
        contentType: 'application/json',
        body: JSON.stringify(response),
    };
};

export const webSocketEvent = (event: XP.WebSocketEvent) => {
    if (isProd) {
        return {
            status: 403,
        };
    }

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
