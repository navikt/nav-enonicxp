
import thymeleafLib from '/lib/thymeleaf';
import { runInContext } from "../../../lib/context/run-in-context";
import * as authLib from '/lib/xp/auth';
import * as contentLib from '/lib/xp/content';
import { logger } from '../../../lib/utils/logging';

type ContentInfo={ 
    displayName: string,
    modifiedTime: string,
    status: string, 
    url: string
}

const view = resolve('./dashboard-content.html');

const getModifiedContentFromUser = () => {

    const user = authLib.getUser()?.key;    
    const results = contentLib.query({
        start: 0,
        count: 20,
        sort: "modifiedTime DESC",
        query: `modifier = "${user}"`
    }).hits.map((hit) => { 
        let status="Ny";
        if (hit.publish?.first) {
            if (hit.publish?.from) {
                if (hit.modifiedTime > hit.publish.from) {
                    status="Endret";
                }
                else {
                    status="Publisert";
                }
            }                    
            else {
                if (hit.modifiedTime > hit.publish.first) {
                    status="Endret";
                }
                else {
                    status="Avpublisert";
                }
            }     
        }               
        return { 
            displayName: hit.displayName, 
            modifiedTime: hit.modifiedTime, 
            status, 
            url: `/admin/tool/com.enonic.app.contentstudio/main/default/edit/${hit._id}`
        }
    });
    
    const published:ContentInfo[] = [];
    const modified = results.map(result => {
        if (result.status === "Publisert") {
            published.push(result);
        }
        else {
            return result;
        }
    })

    logger.info(JSON.stringify(published));
    logger.info(JSON.stringify(modified)); 
    
    return {
        body: thymeleafLib.render(view,{modified, published}),
        contentType: 'text/html',
    };       
}

exports.get = getModifiedContentFromUser;



// Hente innlogget bruker user via authLib
// modifier === user,  --> Hente data fra content
// hente ut modifiedTime fra innholdselementer
// Ny ..> ikke pubblished , 
// Sortere content fra yngst til eldst -> Siste to uker?
// lenker til innholdselementer og vise publiseringsstatus og tid
// ikke behov for ny innholdstype
// Vises dette på dashboardet
// Hva med plassering på dashboardet hvis det er en melding til redaktørene i tillegg?









