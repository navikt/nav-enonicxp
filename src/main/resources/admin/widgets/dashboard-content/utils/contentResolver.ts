import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import { ContentLogData, DashboardContentInfo } from './types';
import dayjs from '/assets/dayjs/1.11.9/dayjs.min.js';
import { getContentProjectIdFromRepoId, getRepoConnection } from '../../../../lib/repos/repo-utils';
import { fixDateFormat } from '../../../../lib/utils/datetime-utils';
import { APP_DESCRIPTOR } from '../../../../lib/constants';
import { stripPathPrefix } from '../../../../lib/paths/path-utils';
import { contentTypesRenderedByEditorFrontend } from '../../../../lib/contenttype-lists';
import { ContentDescriptor, ContentNode } from '../../../../types/content-types/content-config';

type ContentWithLog = {
    content: ContentNode;
    log: ContentLogData;
};

export const NUM_ENTRIES_TO_DISPLAY = 5;

const contentTypesToShow = [
    ...contentTypesRenderedByEditorFrontend,
    `${APP_DESCRIPTOR}:content-list`,
] as const satisfies ContentDescriptor[];

const contentTypesToShowSet: ReadonlySet<ContentDescriptor> = new Set(contentTypesToShow);

const contentTypeNameMap = contentTypesToShow.reduce<Record<string, string>>((acc, contentType) => {
    const typeInfo = contentLib.getType(contentType);
    acc[contentType] = typeInfo?.displayName || contentType;
    return acc;
}, {});

export const layerStr = (repo: string) =>
    repo !== 'default' ? ` [${repo.replace('navno-', '')}]` : '';

const transformToContentData = (
    contentWithLog: ContentWithLog,
    isPublish: boolean
): DashboardContentInfo => {
    const { content, log } = contentWithLog;
    const { repoId, publish, time } = log;
    const isArchived = !!content.archivedTime;
    const projectId = getContentProjectIdFromRepoId(repoId);
    const editorPath = isArchived ? 'widget/plus/archive' : `edit/${content._id}`;
    const modifiedTimeRaw = fixDateFormat((isPublish ? publish?.from : publish?.to) || time);
    const modifiedTime = dayjs(modifiedTimeRaw).format('DD.MM.YYYY - HH:mm:ss');

    return {
        displayName: content.displayName + layerStr(projectId),
        contentType: contentTypeNameMap[content.type],
        modifiedTimeRaw,
        modifiedTime,
        status: isArchived ? 'Arkivert' : '',
        title: stripPathPrefix(content._path),
        url: `/admin/tool/com.enonic.app.contentstudio/main/${projectId}/${editorPath}`,
    };
};

const getContentFromLogs = (logs: ContentLogData[]): ContentWithLog[] => {
    const contentNodes: ContentWithLog[] = [];

    for (const logEntry of logs) {
        const { contentId, repoId } = logEntry;
        const repoConnection = getRepoConnection({ branch: 'draft', repoId, asAdmin: true });

        const content = repoConnection.get<Content>(contentId);
        if (!content || !contentTypesToShowSet.has(content.type)) {
            continue;
        }

        contentNodes.push({
            content,
            log: logEntry,
        });

        if (contentNodes.length === NUM_ENTRIES_TO_DISPLAY) {
            break;
        }
    }

    return contentNodes;
};

export const dashboardContentResolveLogs = (
    logs: ContentLogData[],
    isPublish: boolean
): DashboardContentInfo[] => {
    const contentsWithLogs = getContentFromLogs(logs);

    return contentsWithLogs
        .map((contentWithLog) => transformToContentData(contentWithLog, isPublish))
        .slice(0, NUM_ENTRIES_TO_DISPLAY);
};
