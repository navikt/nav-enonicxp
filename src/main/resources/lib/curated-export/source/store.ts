import { getMiscRepoConnection } from '../../repos/misc-repo';
import { logger } from '../../utils/logging';

// Short-lived curated export state (codes, tokens, manifest jobs) lives in the misc repo,
// so any cluster node can serve the follow-up requests.

export type CuratedStoreRepo = ReturnType<typeof getMiscRepoConnection>;

const RANDOM_BYTE_COUNT = 32;

const toHex = (bytes: number[]) => {
    let hex = '';
    // bytes is a Java byte[], which Babel's for-of helper cannot iterate on Nashorn.
    for (let index = 0; index < bytes.length; index++) {
        hex += ('0' + (bytes[index] & 0xff).toString(16)).slice(-2);
    }
    return hex;
};

export const createRandomHex = () => {
    const SecureRandom = Java.type('java.security.SecureRandom');
    const ByteArray = Java.type('byte[]');
    const bytes = new ByteArray(RANDOM_BYTE_COUNT);
    new SecureRandom().nextBytes(bytes);
    return toHex(bytes);
};

export const sha256Hex = (value: string) => {
    const MessageDigest = Java.type('java.security.MessageDigest');
    const JavaString = Java.type('java.lang.String');
    return toHex(
        MessageDigest.getInstance('SHA-256').digest(new JavaString(value).getBytes('UTF-8'))
    );
};

export const getCuratedStoreRepo = (rootName: string) => {
    const repo = getMiscRepoConnection();
    if (!repo.exists(`/${rootName}`)) {
        repo.create({ _parentPath: '/', _name: rootName });
    }
    return repo;
};

export const deleteExpiredCuratedNodes = (repo: CuratedStoreRepo, rootName: string) => {
    try {
        const expired = repo.query({
            count: 1000,
            query: `_parentPath = '/${rootName}' AND expiresAtMs < ${Date.now()}`,
        });
        if (expired.hits.length > 0) {
            repo.delete(expired.hits.map((hit) => hit.id));
        }
    } catch (error) {
        logger.warning(`Failed to delete expired curated export nodes in /${rootName}: ${error}`);
    }
};
