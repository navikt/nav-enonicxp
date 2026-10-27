import { ByteSource } from '/lib/xp/node';
import * as repoLib from '/lib/xp/repo';
import { isCuratedRepository, isRecord } from '../safety';

type CuratedProjectIcon = { mimeType: string; stream: ByteSource };

// lib-project has no icon API (XP 7 or 8). XP stores a project icon as a binary on the
// project's repository, described under data["com-enonic-cms"].icon.
export const getCuratedProjectIcon = (projectId: string): CuratedProjectIcon | null => {
    const repoId = `com.enonic.cms.${projectId}`;
    if (!isCuratedRepository(repoId)) {
        throw new Error(`Not a curated project: ${projectId}`);
    }
    const projectData = repoLib.get(repoId)?.data?.['com-enonic-cms'];
    const icon = isRecord(projectData) ? projectData.icon : undefined;
    if (!isRecord(icon) || typeof icon.binary !== 'string' || !icon.binary) {
        return null;
    }
    return {
        // The type comes from the source's stored data; only pass on plain image types.
        mimeType:
            typeof icon.mimeType === 'string' && /^image\/[\w.+-]+$/.test(icon.mimeType)
                ? icon.mimeType
                : 'application/octet-stream',
        stream: repoLib.getBinary({ repoId, binaryReference: icon.binary }) as ByteSource,
    };
};
