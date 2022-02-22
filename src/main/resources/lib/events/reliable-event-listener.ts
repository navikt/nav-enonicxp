import eventLib, { EnonicEvent } from '/lib/xp/event';
import { ReliableEventMetaData } from './reliable-event-send';
import { sendAck } from './reliable-event-ack';

const { serverId } = app.config;

export const reliableEventListener = <EventData = undefined>(
    type: string,
    callback: (event: EnonicEvent<ReliableEventMetaData & EventData>) => any
) => {
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
            sendAck(eventId);

            callback(event);
        },
    });
};
