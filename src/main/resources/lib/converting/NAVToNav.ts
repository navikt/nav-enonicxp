import { queryAllLayersToRepoIdBuckets } from '../localization/layers-repo-utils/query-all-layers';
import { getRepoConnection } from '../repos/repo-utils';
import * as nodeLib from '/lib/xp/node';

import { ContentDescriptor } from '../../types/content-types/content-config';
import { logger } from '../utils/logging';

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
const replaceNAVToNav = (str: string) => {
    return str.replace(/\bNAV\b/g, 'Nav');
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
    mutateKeys(node);
    return node;
};

type NAVToNavResult = {
    totalFound: number;
    converted: number;
    failed: number;
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
                                value: '12c52275-b9d8-48b0-af62-75fbcc80392e',
                            },
                        },
                        {
                            term: {
                                field: 'type',
                                value: 'no.nav.navno:situation-page' satisfies ContentDescriptor,
                            },
                        },
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

    Object.entries(hitsPerRepo).forEach(([repoId, hits]) => {
        const layerRepo = getRepoConnection({ repoId, branch: 'draft', asAdmin: true });

        const limitedHits = hits.slice(0, 5);

        limitedHits.forEach((contentId) => {
            layerRepo.modify({
                key: contentId,
                editor: NAVToNavEditor,
            });
        });
    });
};
