import thymeleafLib from '/lib/thymeleaf';
import * as authLib from '/lib/xp/auth';
import * as nodeLib from '/lib/xp/node';
import * as auditLogLib from '/lib/xp/auditlog';
import { Source } from '/lib/xp/node';
import { ADMIN_PRINCIPAL, SUPER_USER } from '../../../lib/constants';
import { getLayersMultiConnection } from '../../../lib/localization/layers-repo-utils/layers-repo-connection';
import { NON_LOCALIZED_QUERY_FILTER } from '../../../lib/localization/layers-repo-utils/localization-state-filters';
import dayjs from '/assets/dayjs/1.11.9/dayjs.min.js';
import utc from '/assets/dayjs/1.11.9/plugin/utc.js';
import { RepoBranch } from 'types/common';

dayjs.extend(utc);

const asAdminParams: Pick<Source, 'user' | 'principals'> = {
    user: {
        login: SUPER_USER,
    },
    principals: [ADMIN_PRINCIPAL],
};

type Params = Omit<Source, 'user' | 'principals'> & { asAdmin?: boolean };
type Publications = 'publish' | 'unpublish';

const getRepoConnection = ({ repoId, branch, asAdmin }: Params) =>
    nodeLib.connect({
        repoId,
        branch,
        ...(asAdmin && asAdminParams),
    });

const getUserPublications = (user: `user:${string}:${string}`, type: Publications) => {
    const branch = {
        publish: 'master',
        unpublish: 'draft',
    } as const;
    const result = auditLogLib.find({
        count: 100,
        from: '2024-01-01T00:00:00Z',
        type: `'system.content.'${type}`,
        users: [user],
    }) as any;

    const getContent = (
        logObject: auditLogLib.LogEntry<auditLogLib.DefaultData>,
        branch: RepoBranch
    ) => {
        if (!logObject) {
            return null;
        }
        const object = logObject?.objects[0];
        if (!object) {
            return null;
        }
        const repoId = object.split(':')[0];
        const contentId = logObject.data.params.contentIds as string;
        return getRepoConnection({
            branch,
            repoId,
        }).get(contentId);
    };

    const entries = result.hits as auditLogLib.LogEntry<auditLogLib.DefaultData>[];
    entries.map((entry) => {
        const dayjsTime = dayjs(entry.time.substring(0, 19).replace('T', ' ')).utc(true).local();
        entry.time = dayjsTime.toString();
    });
    return entries
        .sort((a, b) => (dayjs(a?.time).isAfter(dayjs(b?.time)) ? -1 : 1))
        .slice(0, 5)
        .map((entry) => auditLogLib.get({ id: entry._id }))
        .map((entry) => getContent(entry, branch[type]));
};

type ContentInfo = {
    displayName: string;
    modifiedTime: dayjs.Dayjs;
    modifiedTimeStr: string;
    status: string;
    title: string;
    url: string;
};

const view = resolve('./dashboard-content.html');

const getModifiedContentFromUser = () => {
    const user = authLib.getUser()?.key;

    if (!user) return null;

    // 1. Get 5 last published by user
    const published = getUserPublications(user, 'publish');

    // 2. Get 5 last unpublished by user
    const unPublished = getUserPublications(user, 'unpublish');

    published.forEach((content) => log.info(JSON.stringify(content._name, null, 4)));
    unPublished.forEach((content) => log.info(JSON.stringify(content._name, null, 4)));

    // 3a. Fetch all localized content modified by current user, find status and sort
    const repos = getLayersMultiConnection('draft');
    const results = repos
        .query({
            count: 2,
            query: `modifier = "${user}" AND type LIKE "no.nav.navno:*"`,
            filters: {
                boolean: {
                    mustNot: NON_LOCALIZED_QUERY_FILTER,
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
                return null;
            }

            // modifiedTime med sekunder
            const modifiedStr = draftContent._ts.substring(0, 19).replace('T', ' ');

            if (!draftContent.displayName) {
                draftContent.displayName = 'Uten tittel';
            }

            let status = 'Ny';

            if (masterContent?.publish?.first && masterContent?.publish?.from) {
                // Innholdet ER publisert, eventuelt endret etterpå
                if (draftContent?._versionKey === masterContent?._versionKey) {
                    status = 'Publisert';
                } else {
                    status = 'Endret';
                }
            } else if (draftContent?.publish?.first) {
                // Innholdet er IKKE publisert (er avpublisert), eventuelt endret etterpå

                if (draftContent?.workflow?.state === 'IN_PROGRESS') {
                    status = 'Endret';
                } else if (draftContent?.archivedTime) {
                    status = 'Arkivert';
                } else {
                    status = 'Avpublisert';
                }
            }
            const modifiedLocalTime = dayjs(modifiedStr).utc(true).local();

            const repo = hit.repoId.replace('com.enonic.cms.', '');

            const layer = repo !== 'default' ? ` [${repo.replace('navno-', '')}]` : '';

            return {
                displayName: draftContent.displayName + layer,
                modifiedTime: modifiedLocalTime,
                modifiedTimeStr: dayjs(modifiedLocalTime).format('DD.MM.YYYY HH.mm'),
                status,
                title: draftContent._path.replace('/content/www.nav.no/', ''),
                url: `/admin/tool/com.enonic.app.contentstudio/main/${repo}/edit/${draftContent._id}`,
            };
        })
        .sort((a, b) => (dayjs(a?.modifiedTime).isAfter(dayjs(b?.modifiedTime)) ? -1 : 1));

    // 3b. Get 5 last modified
    let numPublished = 0;
    const modified = results.map((result) => {
        if (result?.status !== 'Publisert' && result?.status !== 'Avpublisert') {
            return numPublished++ < 5 ? result : null;
        }
    });

    return {
        body: thymeleafLib.render(view, { published, modified, unPublished }),
        contentType: 'text/html',
    };
};

exports.get = getModifiedContentFromUser;
