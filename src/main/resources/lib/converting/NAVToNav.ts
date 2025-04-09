import { queryAllLayersToRepoIdBuckets } from '../localization/layers-repo-utils/query-all-layers';
import { getRepoConnection, isDraftAndMasterSameVersion } from '../repos/repo-utils';
import * as contentLib from '/lib/xp/content';

import { runInContext } from '../context/run-in-context';
import * as nodeLib from '/lib/xp/node';

import { ContentDescriptor } from '../../types/content-types/content-config';
import { logger } from '../utils/logging';

type NAVToNavResult = {
    totalFound: number;
    converted: number;
    failed: number;
};

const fieldKeysToSearch: string[] = [
    'displayName',
    'adkomstbeskrivelse',
    'adresse',
    'adresseTilleggsnavn',
    'alertText',
    'allProducts',
    'altText',
    'areasHeader',
    'beskrivelse',
    'body',
    'caption',
    'chatAlertText',
    'chatIngress',
    'contactUsAlertText',
    'contactUsIngress',
    'content',
    'customCategory',
    'dag',
    'description',
    'editorial',
    'epost',
    'explanation',
    'externalProductUrl',
    'fact',
    'faksnummer',
    'formNumbers',
    'fra',
    'frontendEventID',
    'gatenavn',
    'habilitetskontor',
    'header',
    'html',
    'husbokstav',
    'husnummer',
    'informasjonUtbetalinger',
    'ingress',
    'ingressKey',
    'ingressOverride',
    'kanalstrategi',
    'kommentar',
    'label',
    'languageDisclaimer',
    'lenke',
    'lenketekst',
    'linkText',
    'longTitle',
    'margin',
    'maxShortcutsCount',
    'mediaId',
    'moreNewsUrl',
    'name',
    'navn',
    'norwegianTitle',
    'oppgavebehandler',
    'orgNivaa',
    'orgNrTilKommunaltNavKontor',
    'organisasjonsnummer',
    'originaltitle',
    'overordnetEnhet',
    'papirsoeknadInformasjon',
    'period',
    'phoneNumber',
    'postboksanlegg',
    'postboksnummer',
    'postnummer',
    'poststed',
    'pressCall',
    'skriftspraak',
    'sortOrder',
    'sortTitle',
    'sosialeTjenester',
    'spesielleOpplysninger',
    'status',
    'stedsbeskrivelse',
    'stengt',
    'subtitles',
    'summaryText',
    'telefonnummerKommentar',
    'text',
    'textKey',
    'til',
    'title',
    'titleKey',
    'underTitle',
    'value',
    'variableName',
    'ytterligereInformasjon',
];

const replaceNAVToNav = (str: string): string => {
    const orgReplacements: [string, RegExp, string][] = [
        ['NAV Hjelpemiddelsentral', /NAV Hjelpemiddelsentral/g, 'Nav hjelpemiddelsentral'],
        ['NAV Hjelpemidler', /NAV Hjelpemidler/g, 'Nav hjelpemidler'],
        ['NAV Klageinstans', /NAV Klageinstans/g, 'Nav klageinstans'],
    ];

    const orgresult = orgReplacements.reduce((acc, [search, regexp, replace]) => {
        if (!str.includes(search)) {
            return acc;
        }

        return acc.replace(regexp, replace);
    }, str);

    const finalReplacement = orgresult.replace(
        /(<a\b[^>]*>)([^<]*)(<\/a>)|NAV(?![^<]*>)/g,
        (match, openTag, innerText, closeTag) => {
            if (openTag && innerText !== undefined && closeTag) {
                // Replace NAV in anchor text
                const replacedText = innerText.replace(/NAV/g, 'Nav');
                return `${openTag}${replacedText}${closeTag}`;
            }
            return 'Nav';
        }
    );

    return finalReplacement;
};

const mutateKeys = (obj: any) => {
    for (const key in obj) {
        if (fieldKeysToSearch.includes(key) && typeof obj[key] === 'string') {
            obj[key] = replaceNAVToNav(obj[key]);
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
            if (Array.isArray(obj[key])) {
                obj[key].forEach((item) => mutateKeys(item));
            } else {
                mutateKeys(obj[key]);
            }
        }
    }
};

const NAVToNavEditor = (node: nodeLib.RepoNode<any>) => {
    log.info(`Mutating keys for node with ID: ${node._id}`);
    mutateKeys(node);
    return node;
};

export const convertNAVToNav = () => {
    const hitsPerRepo = queryAllLayersToRepoIdBuckets({
        branch: 'draft',
        state: 'localized',
        resolveContent: false,
        queryParams: {
            count: 20000,
            sort: 'modifiedTime DESC',
            query: {
                boolean: {
                    must: [
                        {
                            term: {
                                field: '_id',
                                value: '5a84ff3a-ebf3-42e7-bf5d-e29808c0acaa',
                            },
                        },
                        /*{
                            term: {
                                field: 'type',
                                value: 'no.nav.navno:content-page-with-side-menu' satisfies ContentDescriptor,
                            },
                        },
                        */
                    ],
                },
            },
        },
    });

    const result: NAVToNavResult = {
        totalFound: 0,
        converted: 0,
        failed: 0,
    };

    /*
    Query draft branch for all node type content items with “ready” state containing the phrase
** Apply the “patch” editor on these items, and use the “node push” to move the change into master branch (without changing any dates)

Next, query all items in master branch that still contain the phrase
** Apply the patch to these items directly on master (keep the list of keys)

Finally, update items that are being edited
** Query draft branch for items that are “not ready”
** Apply the patch one final time on these (this will cover any content currently being edited, or not yet published).


// 1. Loop draft and workflow.READY state (keep keys of edited items). Push each to master
// 2. Loop master (use keys)
// 

*/

    Object.entries(hitsPerRepo).forEach(([repoId, hits]) => {
        // const layerRepo = getRepoConnection({ repoId, branch: 'draft', asAdmin: true });

        const limitedHits = hits.slice(0, 5);

        limitedHits.forEach((contentId) => {
            const shouldPushToMaster = isDraftAndMasterSameVersion(contentId, repoId);

            runInContext({ branch: 'draft', asAdmin: true }, () => {
                log.info(`Nav to nav process: ${contentId} - ${repoId} - ${shouldPushToMaster}`);
                contentLib.modify({
                    key: contentId,
                    editor: NAVToNavEditor,
                });

                // log.info(`commitResult: ${JSON.stringify(commitResult)}`);

                if (shouldPushToMaster) {
                    const publishResult = contentLib.publish({
                        keys: [contentId],
                    });

                    log.info(`publishResult: ${JSON.stringify(publishResult)}`);

                    // log.info(`pushResult: ${JSON.stringify(pushResult)}`);
                }
            });
        });
    });
};
