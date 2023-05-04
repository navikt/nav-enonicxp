import * as contentLib from '/lib/xp/content';
import { runInContext } from "../lib/context/run-in-context";

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
                },
            },
        }).hits;

        // Endre til ny datamodell for audience
        hits.forEach( (hit) => {
            contentLib.modify( {
                key: hit._id,
                editor: (content) => {
                    const ac = content as any;
                    ac.data.audience._selected = ac.data.audience;
                    return ac;
                }
            })
        });

        log.info( `Antall sider migrert: ${hits.length}` );
    });
};