import graphQlLib from '/lib/graphql';
import * as contextLib from '/lib/xp/context';
import * as contentLib from '/lib/xp/content';
import * as nodeLib from '/lib/xp/node';
import { getRepoConnection } from '../../../repos/repo-utils';

import { CreationCallback } from '../../utils/creation-callback-utils';
import { getGuillotineContentQueryBaseContentId } from '../../utils/content-query-context';

/*
Bakgrunn: Dersom innhold som allerede er publisert, men gjort endringer i markeres som klar på fredag
slik at en redaktør kan publisere det på mandag, så vil publish.from være satt til fredag.
Det finnes ingen mekanisme som viser at den faktiske publiseringen skjedde på mandag.

Regler for å bestemme "sist publisert":
- Ny publisering: Bruk from
- Forhåndspublisering: Bruk from
- Publisering av eksisterende innhold: Bruk _ts
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
