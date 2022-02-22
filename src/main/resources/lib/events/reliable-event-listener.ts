import eventLib, { EnonicEvent } from '/lib/xp/event';
import { ReliableEventMetaData, sendAck } from './reliable-event-send';
import { clusterInfo } from '../cluster/cluster-utils';

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

                if (prevEventServersAcked.includes(clusterInfo.localServerName)) {
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

            const random = Math.random();
            log.info(`Random number: ${random}`);

            if (random > 0.75) {
                log.info(`NOT acking this event: ${eventId}`);
            } else {
                log.info(`Acking this event: ${eventId}`);
                sendAck(eventId);
            }

            callback(event);
        },
    });
};
