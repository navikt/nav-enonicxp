import thymeleafLib from '/lib/thymeleaf';
import * as authLib from '/lib/xp/auth';
import * as nodeLib from '/lib/xp/node';
import { Source } from '/lib/xp/node';
import { ADMIN_PRINCIPAL, SUPER_USER } from '../../../lib/constants';
import { getLayersMultiConnection } from '../../../lib/localization/layers-repo-utils/layers-repo-connection';
import { NON_LOCALIZED_QUERY_FILTER } from '../../../lib/localization/layers-repo-utils/localization-state-filters';
import dayjs from '/assets/dayjs/1.11.9/dayjs.min.js';
import utc from '/assets/dayjs/1.11.9/plugin/utc.js';

dayjs.extend(utc);

const asAdminParams: Pick<Source, 'user' | 'principals'> = {
    user: {
        login: SUPER_USER,
    },
    principals: [ADMIN_PRINCIPAL],
};

type Params = Omit<Source, 'user' | 'principals'> & { asAdmin?: boolean };

const getRepoConnection = ({ repoId, branch, asAdmin }: Params) =>
    nodeLib.connect({
        repoId,
        branch,
        ...(asAdmin && asAdminParams),
    });

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
    const repos = getLayersMultiConnection('draft');

    // 1. Fetch all localized content modified by current user, find status and sort
    const results = repos
        .query({
            count: 5000,
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
            let modifiedStr = draftContent.modifiedTime.substring(0, 19).replace('T', ' ');

            if (!draftContent.displayName) {
                draftContent.displayName = 'Uten tittel';
            }

            let status = 'Ny';
            if (masterContent?.publish?.first && masterContent?.publish?.from) {
                // Innholdet ER publisert, eventuelt endret etterpå
                if (draftContent?._versionKey === masterContent?._versionKey) {
                    status = 'Publisert';
                    modifiedStr = masterContent.publish.from.substring(0, 19).replace('T', ' ');
                } else {
                    status = 'Publisert, men endret';
                }
            } else if (draftContent?.publish?.first) {
                // Innholdet er IKKE publisert (er avpublisert), eventuelt endret etterpå
                const modifiedTsStr = draftContent._ts.substring(0, 19).replace('T', ' ');
                if (draftContent?.workflow?.state === 'IN_PROGRESS') {
                    status = 'Avpublisert, men endret';
                } else {
                    status = 'Avpublisert';
                    modifiedStr = modifiedTsStr;
                }
            }
            const modifiedLocalTime = dayjs(modifiedStr).utc(true).local();

            const repo = hit.repoId.replace('com.enonic.cms.', '');

            return {
                displayName: draftContent.displayName,
                modifiedTime: modifiedLocalTime,
                modifiedTimeStr: dayjs(modifiedLocalTime).format('DD.MM.YYYY HH.mm'),
                status,
                title: draftContent._path.replace('/content/www.nav.no/', ''),
                url: `/admin/tool/com.enonic.app.contentstudio/main/${repo}/edit/${draftContent._id}`,
            };
        })
        .sort((a, b) => (dayjs(a?.modifiedTime).isAfter(dayjs(b?.modifiedTime)) ? -1 : 1));

    // 2. Get 5 last modified and 5 last published
    const published: ContentInfo[] = [];
    let numModified = 0,
        numPublished = 0;
    const modified = results.map((result) => {
        if (result?.status === 'Publisert') {
            if (numModified++ < 5) {
                published.push(result);
            }
        } else {
            return numPublished++ < 5 ? result : null;
        }
    });

    return {
        body: thymeleafLib.render(view, { modified, published }),
        contentType: 'text/html',
    };
};

exports.get = getModifiedContentFromUser;
