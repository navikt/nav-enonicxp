import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import { findContentsWithFragmentComponent } from '../../lib/utils/component-utils';
import { findContentsWithFragmentMacro } from '../../lib/utils/htmlarea-utils';
import { getServiceRequestSubPath } from '../service-utils';
import { runInContext } from '../../lib/context/run-in-context';
import { CONTENT_ROOT_REPO_ID } from '../../lib/constants';
import { validateServiceSecretHeader } from '../../lib/utils/auth-utils';
import { removeDuplicates } from '../../lib/utils/array-utils';

type FragmentToLocaleCorrelationMap = Record<
    string,
    { fragmentContent: Content<'portal:fragment'>; localeCorrelation: Record<string, number> }
>;

const getLocaleCorrelation = () => {
    const allFragments = contentLib.query({ count: 2000, contentTypes: ['portal:fragment'] }).hits;

    const localeToFragmentsMap: FragmentToLocaleCorrelationMap = {};

    allFragments.forEach((fragment) => {
        const fragmentId = fragment._id;

        removeDuplicates(
            [
                ...findContentsWithFragmentMacro(fragmentId),
                ...findContentsWithFragmentComponent(fragmentId),
            ],
            (a, b) => a._id === b._id
        ).forEach((content) => {
            const { language } = content;
            if (!localeToFragmentsMap[fragmentId]) {
                localeToFragmentsMap[fragmentId] = {
                    fragmentContent: fragment,
                    localeCorrelation: {},
                };
            }

            const mapEntry = localeToFragmentsMap[fragmentId];

            if (!mapEntry.localeCorrelation[language]) {
                mapEntry.localeCorrelation[language] = 0;
            }

            mapEntry.localeCorrelation[language]++;
        });
    });

    return {
        status: 200,
        body: localeToFragmentsMap,
    };
};

export const get = (req: XP.CustomSelectorServiceRequest) => {
    if (!validateServiceSecretHeader(req)) {
        return {
            status: 401,
        };
    }

    const subPath = getServiceRequestSubPath(req);

    return runInContext(
        { branch: 'draft', repository: CONTENT_ROOT_REPO_ID, asAdmin: true },
        () => {
            if (subPath === 'getLocaleCorrelation') {
                return getLocaleCorrelation();
            }

            return {
                status: 200,
            };
        }
    );
};
