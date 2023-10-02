
import thymeleafLib from '/lib/thymeleaf';
import { runInContext } from "../../../lib/context/run-in-context";
import * as authLib from '/lib/xp/auth';
import * as contentLib from '/lib/xp/content';
import { logger } from '../../../lib/utils/logging';
import * as nodeLib from '/lib/xp/node';
import { Source } from '/lib/xp/node';
import { ADMIN_PRINCIPAL, CONTENT_REPO_PREFIX, SUPER_USER } from '../../../lib/constants';

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
}
);

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
        count: 10,
        sort: "modifiedTime DESC",
        query: `modifier = "${user}"`
    }).hits.map((hit) => { 

        const draftContent = getRepoConnection({ branch: 'draft', repoId: 'com.enonic.cms.default' }).get(hit._id);
        const masterContent = getRepoConnection({ branch: 'master', repoId: 'com.enonic.cms.default' }).get(hit._id); 

        let convertModifiedTime = hit.modifiedTime; 
        convertModifiedTime = convertModifiedTime.substring(0,10);

        let status="Ny";
        
        if (hit.publish?.first) {
            if (hit.publish?.from) {
                    if (draftContent?._versionKey === masterContent?._versionKey ) { 
                        status="Publisert" 
                    }
                    else {
                        status="Endret";
                    }      
                }                    
            else { status="Avpublisert";          
            }     
        }                     
        return { 
            displayName: hit.displayName, 
            modifiedTime: convertModifiedTime,
            status, 
            url: `/admin/tool/com.enonic.app.contentstudio/main/default/edit/target="_blank".${hit._id}`
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
    
    return {
        body: thymeleafLib.render(view,{modified, published}),
        contentType: 'text/html',
    };       
}

exports.get = getModifiedContentFromUser;