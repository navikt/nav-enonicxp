const Thread = Java.type('java.lang.Thread');

export const getCurrentThreadId = () => Number(Thread.currentThread().getId());
