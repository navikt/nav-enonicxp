import eventLib, { EnonicEvent } from '/lib/xp/event';
import taskLib from '/lib/xp/task';
import { generateUUID } from '../utils/uuid';
import { clusterInfo } from '../utils/cluster-utils';
import { EmptyObject } from '../../types/util-types';
import { logger } from '../utils/logging';

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

type EventProps<EventData> = {
    type: string;
    data?: EventData;
    timeoutMs?: number;
    retries?: number;
};

const ackEventType = 'ack';

const timeoutMsDefault = 10000;
const timeoutMsIncrement = 2000;
const timeoutMsMax = 20000;

const retriesDefault = 10;
const retriesMax = 10;

const eventIdToAckedServerIds: { [eventId: string]: string[] } = {};

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

    if (!eventIdToAckedServerIds[eventId]) {
        eventIdToAckedServerIds[eventId] = [];
    }

    taskLib.executeFunction({
        description: `Await acknowledgements for event ${eventId}`,
        func: () => {
            taskLib.sleep(timeoutMs);

            const serversAcked = eventIdToAckedServerIds[eventId];
            if (!serversAcked) {
                logger.error(`Acked list not found for event ${eventId}`);
                return;
            }

            const numServersMissing = clusterInfo.nodeCount - serversAcked.length;

            if (numServersMissing > 0) {
                if (retries > 0) {
                    logger.warning(
                        `${numServersMissing} servers did not ack event ${eventId} before timeout - retries remaining: ${retries}`
                    );
                    _sendReliableEvent({
                        type,
                        data,
                        timeoutMs: Math.min(timeoutMs + timeoutMsIncrement, timeoutMsMax),
                        retries: retries - 1,
                        retryProps: {
                            prevEventId: eventId,
                            prevEventServersAcked: serversAcked,
                        },
                    });
                } else {
                    logger.critical(
                        `${numServersMissing} servers did not ack event ${eventId} before timeout - no retries remaining. This event may not have propagated fully!`
                    );
                    delete eventIdToAckedServerIds[eventId];
                }
            } else {
                logger.info(`Event ${eventId} acked by all servers`);
                delete eventIdToAckedServerIds[eventId];
            }
        },
    });
};

const sendAck = (eventId: string) => {
    eventLib.send({
        type: ackEventType,
        distributed: true,
        data: {
            serverId: clusterInfo.localServerName,
            eventId,
        } as AckEventData,
    });
};

const _sendReliableEvent = <EventData>({
    type,
    data,
    timeoutMs,
    retries,
    retryProps,
}: EventProps<EventData> & {
    retryProps?: ReliableEventRetryProps;
}) => {
    if (retryProps) {
        logger.warning(
            `Retrying event ${
                retryProps.prevEventId
            } - excluding servers ${retryProps.prevEventServersAcked.join(', ')}`
        );
    }

    const eventId = retryProps?.prevEventId || `${type}-${generateUUID()}`;

    const metaData: ReliableEventMetaData = { eventId, retryProps };

    handleAcks({ type, data, timeoutMs, retries, metaData });

    eventLib.send({
        type,
        distributed: true,
        data: { ...data, ...metaData },
    });
};

export const sendReliableEvent = <EventData = EmptyObject>({
    type,
    data,
    timeoutMs,
    retries,
}: EventProps<EventData>) => {
    const _timeoutMs = timeoutMs && Math.min(timeoutMs, timeoutMsMax);
    const _retries = retries && Math.min(retries, retriesMax);

    _sendReliableEvent<EventData>({
        type,
        data,
        timeoutMs: _timeoutMs,
        retries: _retries,
    });
};

export const addReliableEventListener = <EventData = EmptyObject>({
    type,
    callback,
}: {
    type: string;
    callback: (event: EnonicEvent<ReliableEventMetaData & EventData>) => any;
}) => {
    eventLib.listener<ReliableEventMetaData & EventData>({
        type: `custom.${type}`,
        localOnly: false,
        callback: (event) => {
            const { eventId, retryProps } = event.data;

            if (retryProps) {
                // Ignore the retry-event if this server had previously acknowledged it
                if (retryProps.prevEventServersAcked.includes(clusterInfo.localServerName)) {
                    return;
                }

                logger.info(`Retry event ${eventId} received`);
            } else {
                logger.info(`Event ${eventId} received`);
            }

            sendAck(eventId);
            callback(event);
        },
    });
};

let ackListenerStarted = false;

export const startReliableEventAckListener = () => {
    if (ackListenerStarted) {
        logger.error(`Attempted to start event ack listener multiple times!`);
        return;
    }

    ackListenerStarted = true;

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

            if (ackedServerIds.includes(serverId)) {
                logger.warning(`Event ${eventId} was already acked by server ${serverId}!`);
            } else {
                logger.info(`Event ${eventId} acked by server ${serverId}`);
                ackedServerIds.push(serverId);
            }
        },
    });
};
