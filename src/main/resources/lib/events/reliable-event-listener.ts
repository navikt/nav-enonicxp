import eventLib, { EnonicEvent } from '/lib/xp/event';
import { CustomEventData } from './reliable-event-send';
import { sendAck } from './reliable-event-ack';

const { serverId } = app.config;

export const reliableEventListener = (
    type: string,
    callback: (event: EnonicEvent<CustomEventData>) => any
) => {
    eventLib.listener<CustomEventData>({
        type: `custom.${type}`,
        callback: (event) => {
            const { eventId, targetServers } = event.data;
            if (targetServers && !targetServers.includes(serverId)) {
                log.info(`Event ${eventId} is not targeted for this server - ignoring this event`);
                return;
            }

            log.info(`Event ${eventId} received, lets acknowledge and then do stuff!`);

            sendAck(eventId);
            callback(event);
        },
    });
};
