import eventLib from '/lib/xp/event';
import taskLib from '/lib/xp/task';
import { ReliableEventMetaData, sendReliableEvent } from './reliable-event-send';

type AckEventData = {
    serverId: string;
    eventId: string;
};

const { serverId, numServers } = app.config;

const ackEventType = 'custom.ack';

const timeoutMsDefault = 5000;
const retriesDefault = 10;

const eventIdToServerAckedIds: { [eventId: string]: string[] } = {};

const getNumServersMissing = (eventData: ReliableEventMetaData) => {
    const { eventId, retryProps } = eventData;
    const serversAcked = eventIdToServerAckedIds[eventId];

    return retryProps
        ? numServers - serversAcked.length - retryProps.prevEventServersAcked.length
        : numServers - serversAcked.length;
};

export const handleAcks = ({
    type,
    metaData,
    data,
    timeoutMs = timeoutMsDefault,
    retries = retriesDefault,
}: {
    type: string;
    data?: any;
    timeoutMs?: number;
    retries?: number;
    metaData: ReliableEventMetaData;
}) => {
    const { eventId } = metaData;

    eventIdToServerAckedIds[eventId] = [];

    taskLib.executeFunction({
        description: `Await acknowledgements for event ${eventId}`,
        func: () => {
            taskLib.sleep(timeoutMs);

            const numServersMissing = getNumServersMissing(metaData);

            if (numServersMissing > 0) {
                if (retries > 0) {
                    log.warning(
                        `${numServersMissing} servers did not ack event ${eventId} before timeout - retries remaining: ${retries}`
                    );
                    sendReliableEvent({
                        type,
                        data,
                        timeoutMs,
                        retries: retries - 1,
                        retryProps: {
                            prevEventId: eventId,
                            prevEventServersAcked: eventIdToServerAckedIds[eventId],
                        },
                    });
                } else {
                    log.error(
                        `${numServersMissing} did not ack event ${eventId} before timeout - no retries remaining`
                    );
                }
            } else {
                log.info(`Event ${eventId} acked by all servers`);
            }

            delete eventIdToServerAckedIds[eventId];
        },
    });
};

export const sendAck = (eventId: string) => {
    eventLib.send({
        type: ackEventType,
        distributed: true,
        data: {
            serverId,
            eventId,
        } as AckEventData,
    });
};

export const startCustomEventAckListener = () => {
    eventLib.listener<AckEventData>({
        type: ackEventType,
        callback: (event) => {
            const { serverId, eventId } = event.data;
            log.info(`Event ${eventId} acked by server ${serverId}`);
            eventIdToServerAckedIds[eventId].push(serverId);
        },
    });
};
