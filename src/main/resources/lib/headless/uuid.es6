const UUID = Java.type('java.util.UUID');

const generateUUID = () => UUID.randomUUID().toString();

const isUUID = (id) =>
    id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);

module.exports = { isUUID, generateUUID };
