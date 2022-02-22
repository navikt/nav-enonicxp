import eventLib, { EnonicEvent } from '/lib/xp/event';
import { ReliableEventMetaData, sendAck } from './reliable-event-send';

const { serverId } = app.config;

export const addReliableEventListener = <EventData = undefined>({
    type,
    callback,
}: {
    type: string;
    callback: (event: EnonicEvent<ReliableEventMetaData & EventData>) => any;
}) => {
    eventLib.listener<ReliableEventMetaData & EventData>({
        type: `custom.${type}`,
        callback: (event) => {
            const { eventId, retryProps } = event.data;

            if (retryProps) {
                const { prevEventId, prevEventServersAcked } = retryProps;

                if (prevEventServersAcked.includes(serverId)) {
                    log.info(
                        `Event ${prevEventId} was already processed on this server - ignoring repeat event ${eventId}`
                    );
                    return;
                } else {
                    log.warning(
                        `Event ${eventId} received as repeat of previously missed event ${prevEventId}`
                    );
                }
            }

            log.info(`Event ${eventId} received, lets acknowledge and then do stuff!`);

            if (Math.random() > 0.5) {
                log.info(`[test] Not acking this event!`);
                sendAck(eventId);
            }

            callback(event);
        },
    });
};
