import graphQlLib from '/lib/graphql';
import * as contextLib from '/lib/xp/context';
import * as contentLib from '/lib/xp/content';
import * as nodeLib from '/lib/xp/node';
import { getRepoConnection } from '../../../repos/repo-utils';

import { CreationCallback } from '../../utils/creation-callback-utils';
import { getGuillotineContentQueryBaseContentId } from '../../utils/content-query-context';

/*
Bakgrunn: Hvis innhold som allerede er publisert markeres som 'klar' på fredag
slik at en redaktør kan publisere det på mandag, så vil publish.from være satt til fredag,
slik at det ser ut som at innholdet ble publisert på fredag og ikke mandag.
Det finnes ingen innebygget XP-mekanisme som viser at den faktiske publiseringen skjedde på mandag.

Derimot vil _ts alltid oppdateres til den faktiske publiseringsdatoen når innholdet publiseres.

Løsning: Vi definerer en ny felt 'lastPublished' som tar høyde for dette ved å bruke publish.from
kun dersom denne datoen er nyere enn _ts i master.
*/
export const determineLastPublished = (
    node: nodeLib.RepoNode<contentLib.Content>
): string | null => {
    const publishFrom = node.publish?.from;
    const changedTs = node._ts;

    if (publishFrom && new Date(publishFrom).getTime() > new Date(changedTs).getTime()) {
        return publishFrom;
    }

    return changedTs;
};

export const generalDataCallback: CreationCallback = (context, params) => {
    params.fields.lastPublished = {
        type: graphQlLib.GraphQLString,
    };

    params.fields.lastPublished.resolve = (env) => {
        const contentId = getGuillotineContentQueryBaseContentId();
        if (!contentId) {
            return null;
        }

        const repoId = contextLib.get().repository;

        const masterConnection = getRepoConnection({ branch: 'master', repoId, asAdmin: true });

        const masterNode = masterConnection.get<contentLib.Content>({ key: contentId });

        if (!masterNode) {
            return null;
        }

        return determineLastPublished(masterNode);
    };
};
