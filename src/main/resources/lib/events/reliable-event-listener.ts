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
            } else {
                log.info(`Event ${eventId} received`);
            }

            sendAck(eventId);

            callback(event);
        },
    });
};
