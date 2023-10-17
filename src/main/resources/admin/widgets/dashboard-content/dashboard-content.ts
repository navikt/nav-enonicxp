import thymeleafLib from '/lib/thymeleaf';
import * as authLib from '/lib/xp/auth';
import * as nodeLib from '/lib/xp/node';
import { Source } from '/lib/xp/node';
import { ADMIN_PRINCIPAL, SUPER_USER } from '../../../lib/constants';
import { getLayersMultiConnection } from '../../../lib/localization/locale-utils';
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
    modifiedTime: string;
    status: string;
    title: string;
    url: string;
};

const view = resolve('./dashboard-content.html');

const getModifiedContentFromUser = () => {
    const user = authLib.getUser()?.key;
    const repos = getLayersMultiConnection('draft');
    const results = repos
        .query({
            start: 0,
            count: 10,
            sort: 'modifiedTime DESC',
            query: `modifier = "${user}"`,
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

            let modifiedStr = draftContent.modifiedTime.substring(0, 16).replace('T', ' ');

            if (!draftContent.displayName) {
                draftContent.displayName = 'Uten tittel';
            }

            let status = 'Ny';

            if (masterContent?.publish?.first) {
                if (masterContent?.publish?.from) {
                    if (draftContent?._versionKey === masterContent?._versionKey) {
                        status = 'Publisert';
                        modifiedStr = masterContent.publish.from.substring(0, 16).replace('T', ' ');
                    } else {
                        status = 'Endret';
                    }
                }
            } else if (draftContent?.publish?.first) {
                modifiedStr = JSON.stringify(draftContent._ts.substring(0, 16).replace('T', ' '));
                status = 'Avpublisert';
            }

            const modifiedStrLocalTime = dayjs(modifiedStr)
                .utc(true)
                .local()
                .format('DD.MM.YYYY HH.mm');

            return {
                displayName: draftContent.displayName,
                modifiedTime: modifiedStrLocalTime,
                status,
                title: draftContent._path.replace('/content/www.nav.no/', ''),
                url: `/admin/tool/com.enonic.app.contentstudio/main/default/edit/${draftContent._id}`,
            };
        });

    const published: ContentInfo[] = [];
    const modified = results.map((result) => {
        if (result?.status === 'Publisert') {
            published.push(result);
        } else {
            return result;
        }
    });

    return {
        body: thymeleafLib.render(view, { modified, published }),
        contentType: 'text/html',
    };
};

exports.get = getModifiedContentFromUser;
