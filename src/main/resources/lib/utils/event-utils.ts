import eventLib, { EnonicEvent } from '/lib/xp/event';

export const ackEvent = 'ack-event';

export const ackCustomEvent = (event: EnonicEvent) => {
    eventLib.send({
        type: ackEvent,
        distributed: true,
    });
};
