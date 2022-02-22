import eventLib from '/lib/xp/event';
import taskLib from '/lib/xp/task';
import { generateUUID } from '../utils/uuid';

type AckEventData = {
    serverId: string;
    eventId: string;
};

type ReliableEventRetryProps = {
    prevEventServersAcked: string[];
    prevEventId: string;
};

export type ReliableEventMetaData = {
    eventId: string;
    retryProps?: ReliableEventRetryProps;
};

const { serverId, numServers } = app.config;
const ackEventType = 'custom.ack';
const timeoutMsDefault = 5000;
const retriesDefault = 10;

const eventIdToServerAckedIdsMap: { [eventId: string]: string[] } = {};

const getNumServersMissing = (eventData: ReliableEventMetaData) => {
    const { eventId, retryProps } = eventData;
    const serversAcked = eventIdToServerAckedIdsMap[eventId];

    return retryProps
        ? numServers - serversAcked.length - retryProps.prevEventServersAcked.length
        : numServers - serversAcked.length;
};

const handleAcks = ({
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

    eventIdToServerAckedIdsMap[eventId] = [];

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
                            prevEventServersAcked: eventIdToServerAckedIdsMap[eventId],
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

            delete eventIdToServerAckedIdsMap[eventId];
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
            eventIdToServerAckedIdsMap[eventId].push(serverId);
        },
    });
};

export const sendReliableEvent = <EventData = undefined>({
    type,
    data,
    timeoutMs,
    retries,
    retryProps,
}: {
    type: string;
    data?: EventData;
    timeoutMs?: number;
    retries?: number;
    retryProps?: ReliableEventRetryProps;
}) => {
    const eventId = `event-${type}-${generateUUID()}`;

    if (retryProps) {
        log.info(
            `Retrying event ${
                retryProps.prevEventId
            } as new event ${eventId} - excluding servers ${retryProps.prevEventServersAcked.join(
                ', '
            )}`
        );
    }

    const metaData = { eventId, retryProps };

    handleAcks({ type, data, timeoutMs, retries, metaData });

    eventLib.send({
        type,
        distributed: true,
        data: { ...data, ...metaData },
    });
};
