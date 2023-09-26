
import thymeleafLib from '/lib/thymeleaf';
import { runInContext } from "../../../lib/context/run-in-context";
import * as authLib from '/lib/xp/auth';
import * as contentLib from '/lib/xp/content';
import { logger } from '../../../lib/utils/logging'; 


const getModifiedContentFromUser = () => {

    const user = authLib.getUser()?.key;  
    
    logger.info(JSON.stringify(user));   
  
    const results = contentLib.query({
        start: 0,
        count: 2,
        sort: "modifiedTime DESC",
        query: `modifier = "${user}"`
    }).hits.map((hit) => { 
        return { 
            displayName: hit.displayName, 
            modifiedTime: hit.modifiedTime, 
            published: !!hit.publish?.from, 
            url: `/admin/tool/com.enonic.app.contentstudio/main/default/edit/${hit._id}`
        }
    });

    logger.info(JSON.stringify(results));      
}

exports.get = getModifiedContentFromUser;



// Hente innlogget bruker user via authLib
// modifier === user,  --> Hente data fra content
// hente ut modifiedTime fra innholdselementer
// Sortere content fra yngst til eldst -> Siste to uker?
// lenker til innholdselementer og vise publiseringsstatus og tid
// ikke behov for ny innholdstype
// Vises dette på dashboardet
// Hva med plassering på dashboardet hvis det er en melding til redaktørene i tillegg?









