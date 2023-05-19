import * as contentLib from '/lib/xp/content';
import * as nodeLib from '/lib/xp/node';
import { runInContext } from '../lib/context/run-in-context';

export const audienceMigration = () => {
    runInContext({ branch: 'draft', asAdmin: true }, () => {
        // Finn alt innhold som har feltet data.audience
        const hits = contentLib.query({
            start: 0,
            count: 1000,
            filters: {
                boolean: {
                    must: {
                        exists: {
                            field: 'data.audience',
                        },
                    },
                    mustNot: {
                        exists: {
                            field: 'data.audience._selected',
                        },
                    },
                },
            },
        }).hits;

        // Endre til ny datamodell for audience
        const repo = nodeLib.connect({
            repoId: 'com.enonic.cms.default',
            branch: 'draft',
        });

        let num = 1;
        hits.forEach((hit) => {
            repo.modify({
                key: hit._id,
                editor: (node) => {
                    const oldAudience = node.data.audience;
                    if (oldAudience._selected === undefined) {
                        log.info(`${num++}: ${hit._path} Audience: ${oldAudience}`);
                        node.data.audience = { _selected: oldAudience };
                    }
                    return node;
                },
            });
        });
        log.info(`Antall sider migrert: ${hits.length}`);
    });
};
