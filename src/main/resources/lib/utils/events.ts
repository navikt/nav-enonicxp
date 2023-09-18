// Custom event names must be prefixed with "custom." on listeners but not on senders
export const customListenerType = (eventName: string) => `custom.${eventName}`;
