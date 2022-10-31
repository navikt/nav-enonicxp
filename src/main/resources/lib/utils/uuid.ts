const UUID = Java.type('java.util.UUID');
const JavaString = Java.type('java.lang.String');

export const generateUUID = (seed?: string) =>
    seed
        ? UUID.nameUUIDFromBytes(new JavaString(seed).getBytes()).toString()
        : UUID.randomUUID().toString();

export const isUUID = (id?: string): id is string =>
    !!(
        id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
    );
