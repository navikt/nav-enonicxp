import eventLib, { EnonicEvent } from '/lib/xp/event';
import taskLib from '/lib/xp/task';
import { generateUUID } from '../utils/uuid';
import { clusterInfo } from '../cluster/cluster-utils';

/*
 * This system allows nodes in the server cluster to exchange reliable events
 * Events received will be acknowledged by every node in the cluster, and will be resent should any
 * servers fail to ack the event before the specified timeout, as long as the remaining retry count
 * is >0. We do not handle ack-events being lost, so the event listener callbacks must be tolerant
 * of repeated calls from the same event.
 *
 * */

type AckEventData = {
    serverId: string;
    eventId: string;
};

type ReliableEventRetryProps = {
    prevEventServersAcked: string[];
    prevEventId: string;
};

type ReliableEventMetaData = {
    eventId: string;
    retryProps?: ReliableEventRetryProps;
};

const ackEventType = 'ack';
const timeoutMsDefault = 2000;
const retriesDefault = 10;

const eventIdToAckedServerIds: { [eventId: string]: string[] } = {};

const getNumServersMissing = (eventData: ReliableEventMetaData) => {
    const { eventId, retryProps } = eventData;
    const serversAcked = eventIdToAckedServerIds[eventId];

    return retryProps
        ? clusterInfo.nodeCount - serversAcked.length - retryProps.prevEventServersAcked.length
        : clusterInfo.nodeCount - serversAcked.length;
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

    eventIdToAckedServerIds[eventId] = [];

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
                            prevEventServersAcked: eventIdToAckedServerIds[eventId],
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

            delete eventIdToAckedServerIds[eventId];
        },
    });
};

export const sendAck = (eventId: string) => {
    eventLib.send({
        type: ackEventType,
        distributed: true,
        data: {
            serverId: clusterInfo.localServerName,
            eventId,
        } as AckEventData,
    });
};

export const startReliableEventAckListener = () => {
    eventLib.listener<AckEventData>({
        type: `custom.${ackEventType}`,
        callback: (event) => {
            const { serverId, eventId } = event.data;
            const ackedServerIds = eventIdToAckedServerIds[eventId];

            // This entry only exists if the event originated on the current server
            // The server should only handle acks for events which it sent out
            if (!ackedServerIds) {
                return;
            }

            log.info(`Event ${eventId} acked by server ${serverId}`);
            if (ackedServerIds.includes(serverId)) {
                log.warning(`Server ${serverId} has already acked event ${eventId}!`);
            } else {
                ackedServerIds.push(serverId);
            }
        },
    });
};

export const sendReliableEvent = <EventData = never>({
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

    const metaData: ReliableEventMetaData = { eventId, retryProps };

    handleAcks({ type, data, timeoutMs, retries, metaData });

    eventLib.send({
        type,
        distributed: true,
        data: { ...data, ...metaData },
    });
};

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

                // Ignore the retry-event if this server had previously acknowledged it
                if (prevEventServersAcked.includes(clusterInfo.localServerName)) {
                    return;
                }

                log.warning(
                    `Event ${eventId} received as repeat of previously missed event ${prevEventId}`
                );
            } else {
                log.info(`Event ${eventId} received`);
            }

            sendAck(eventId);

            callback(event);
        },
    });
};
