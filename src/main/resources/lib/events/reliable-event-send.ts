import eventLib from '/lib/xp/event';
import { generateUUID } from '../utils/uuid';
import { handleAcks } from './reliable-event-ack';

type ReliableEventRetryProps = {
    prevEventServersAcked: string[];
    prevEventId: string;
};

export type ReliableEventMetaData = {
    eventId: string;
    retryProps?: ReliableEventRetryProps;
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
