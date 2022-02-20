import eventLib from '/lib/xp/event';
import { generateUUID } from '../utils/uuid';
import { handleAcks } from './reliable-event-ack';

export type CustomEventData = {
    eventId: string;
    targetServers?: string[];
};

export const sendReliableEvent = ({
    type,
    data,
    timeoutMs,
    retries,
    targetServers,
}: {
    type: string;
    data?: Record<string, any>;
    timeoutMs?: number;
    retries?: number;
    targetServers?: string[];
}) => {
    const eventId = `event-${type}-${generateUUID()}`;

    handleAcks({ eventId, type: type, data: data, timeoutMs, retries });

    eventLib.send({
        type,
        distributed: true,
        data: { ...data, eventId, targetServers },
    });
};
