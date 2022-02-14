const UUID = Java.type('java.util.UUID');
const String = Java.type('java.String');

export const generateUUID = () => UUID.randomUUID().toString();

export const isUUID = (id: string) =>
    id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);

export const generateHashCode = (str: string) => {
    const hashCode = String.hashCode(str);
    log.info(`Generated hashcode from string ${str}: ${hashCode}`);
    return hashCode;
};
