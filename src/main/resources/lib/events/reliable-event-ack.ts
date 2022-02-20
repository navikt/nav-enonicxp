import eventLib from '/lib/xp/event';
import taskLib from '/lib/xp/task';
import { sendReliableEvent } from './reliable-event-send';

type AckEventData = {
    serverId: string;
    eventId: string;
};

const { serverId, numServers } = app.config;

const ackEventType = 'custom.ack';

const timeoutMsDefault = 5000;
const retriesDefault = 10;

const ackState: { [eventId: string]: string[] } = {};

export const handleAcks = ({
    eventId,
    type,
    data,
    timeoutMs = timeoutMsDefault,
    retries = retriesDefault,
}: {
    eventId: string;
    type: string;
    data: any;
    timeoutMs?: number;
    retries?: number;
}) => {
    ackState[eventId] = [];

    taskLib.executeFunction({
        description: `Await acknowledgements for event ${eventId}`,
        func: () => {
            taskLib.sleep(timeoutMs);

            if (ackState[eventId].length < numServers) {
                log.warning(`Oh noes, someone didnt ack this event! Retries remaining: ${retries}`);
                if (retries > 0) {
                    sendReliableEvent({ type, data, timeoutMs, retries: retries - 1 });
                }
            } else {
                log.info(`All good!`);
                delete ackState[eventId];
            }
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
            log.info(`Event acked!`);
            ackState[eventId].push(serverId);
        },
    });
};
