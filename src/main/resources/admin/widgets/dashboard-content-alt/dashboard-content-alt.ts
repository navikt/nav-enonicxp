import thymeleafLib from '/lib/thymeleaf';
import * as authLib from '/lib/xp/auth';
import { UserKey } from '/lib/xp/auditlog';
import * as contentLib from '/lib/xp/content';
import { APP_DESCRIPTOR } from '../../../lib/constants';
import { getLayersMultiConnection } from '../../../lib/localization/layers-repo-utils/layers-repo-connection';
import { NON_LOCALIZED_QUERY_FILTER } from '../../../lib/localization/layers-repo-utils/localization-state-filters';
import { contentTypesRenderedByEditorFrontend } from '../../../lib/contenttype-lists';
import dayjs from '/assets/dayjs/1.11.9/dayjs.min.js';
import utc from '/assets/dayjs/1.11.9/plugin/utc.js';
import { getContentProjectIdFromRepoId, getRepoConnection } from '../../../lib/utils/repo-utils';
import { notNullOrUndefined } from '../../../lib/utils/mixed-bag-of-utils';
import { DashboardContentInfo } from './utils/types';
import { ContentDescriptor } from '../../../types/content-types/content-config';
import { logger } from '../../../lib/utils/logging';
import { dashboardContentBuildPublishLists } from './utils/buildPublishLists';

const view = resolve('./dashboard-content-alt.html');

dayjs.extend(utc);

const getFromDate = () => dayjs().subtract(6, 'months'); // Går bare 6 måneder tilbake i tid

const contentTypesToShow = [
    ...contentTypesRenderedByEditorFrontend,
    `${APP_DESCRIPTOR}:content-list`,
] as const satisfies ContentDescriptor[];

const contentInfo = contentTypesToShow.map((contentType) => {
    const typeInfo = contentLib.getType(contentType);
    return {
        type: contentType,
        name: typeInfo ? typeInfo.displayName : '',
    };
});

const layerStr = (repo: string) => (repo !== 'default' ? ` [${repo.replace('navno-', '')}]` : '');

// Lag dayjs-dato - Kan være på Elastic-format (yyyy-mm-ddThh:mm:ss.mmmmmmZ)
const dayjsDateTime = (datetime: string) => {
    const localDate =
        datetime && datetime.search('Z') !== -1
            ? datetime.substring(0, 19).replace('T', ' ') // Er på Elastic-format
            : datetime;
    if (!localDate) {
        return '';
    }
    return dayjs(localDate).utc(true).local().toISOString();
};

// Hent brukers endringer av innhold siste 6 måneder (bare lokalisert innhold av "våre" innholdsyper)
const getUsersModifications = (user: UserKey): DashboardContentInfo[] => {
    const repos = getLayersMultiConnection('draft');
    return repos
        .query({
            count: 5000,
            query: `modifier = '${user}' AND range('modifiedTime', instant('${getFromDate().toISOString()}'), '')`,
            filters: {
                boolean: {
                    mustNot: NON_LOCALIZED_QUERY_FILTER,
                    must: {
                        hasValue: {
                            field: 'type',
                            values: contentTypesToShow,
                        },
                    },
                },
            },
        })
        .hits.map((hit) => {
            const draftContent = getRepoConnection({
                branch: 'draft',
                repoId: hit.repoId,
            }).get(hit.id);
            const masterContent = getRepoConnection({
                branch: 'master',
                repoId: hit.repoId,
            }).get(hit.id);

            if (!draftContent) {
                return undefined;
            }

            if (!draftContent.displayName) {
                draftContent.displayName = 'Uten tittel';
            }
            let status = 'Ny';
            if (masterContent?.publish?.first && masterContent?.publish?.from) {
                // Innholdet ER publisert, eventuelt endret etterpå
                if (draftContent?._versionKey !== masterContent?._versionKey) {
                    // Publisert, men endret etterpå
                    status = 'Endret';
                } else {
                    // Publisert, skal ikke vises her
                    return undefined;
                }
            } else if (draftContent?.archivedTime) {
                // Arkivert, skal ikke vises her
                return undefined;
            } else if (draftContent?.publish?.first) {
                // Avpublisert, eventuelt endret etterpå
                if (draftContent?.workflow?.state === 'IN_PROGRESS') {
                    status = 'Endret';
                } else {
                    // Avpublisert, skal ikke vises her
                    return undefined;
                }
            }

            const modifiedLocalTime = dayjsDateTime(draftContent.modifiedTime);
            const projectId = getContentProjectIdFromRepoId(hit.repoId);
            const layer = layerStr(projectId);
            const contentTypeInfo = contentInfo.find((el) => el.type === draftContent.type);
            const dateFinal = dayjs(modifiedLocalTime).format('DD.MM.YYYY - HH:mm:ss');

            return {
                displayName: draftContent.displayName + layer,
                contentType: contentTypeInfo ? contentTypeInfo.name : '',
                modifiedTimeRaw: modifiedLocalTime,
                modifiedTime: dateFinal,
                status,
                title: draftContent._path.replace('/content/www.nav.no/', ''),
                url: `/admin/tool/com.enonic.app.contentstudio/main/${projectId}/edit/${draftContent._id}`,
            };
        })
        .filter(notNullOrUndefined)
        .sort((a, b) => (dayjs(a?.modifiedTime).isAfter(dayjs(b?.modifiedTime)) ? -1 : 1))
        .slice(0, 5);
};

const getUsersLastContent = () => {
    // Hent aktuell bruker (redaktør)
    const user = authLib.getUser()?.key;
    if (!user) {
        return null;
    }

    const { published, prePublished, unPublished } = dashboardContentBuildPublishLists(user);

    logger.info(JSON.stringify(published));

    const modified = getUsersModifications(user);

    return {
        body: thymeleafLib.render(view, { published, prePublished, modified, unPublished }),
        contentType: 'text/html',
    };
};

export const get = getUsersLastContent;
