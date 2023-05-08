import * as portalLib from '/lib/xp/portal';
import { Content } from '/lib/xp/content';
import { frontendProxy } from './frontend-proxy';
import { forceArray } from '../utils/array-utils';
import { getRepoConnection } from '../utils/repo-utils';

const migrateOldUrlField = (req: XP.Request) => {
    const content = portalLib.getContent();
    if (content?.type !== 'no.nav.navno:form-details') {
        return;
    }

    const formType = forceArray(content.data?.formType);

    let didMigrate = false;

    formType.forEach((formTypeField) => {
        const { _selected } = formTypeField;
        const variations = forceArray((formTypeField as any)[_selected].variations);
        return variations.forEach((variation) => {
            const { url } = variation;
            if (!url) {
                return;
            }

            variation.link = {
                _selected: 'external',
                external: { url: url.toLowerCase().startsWith('http') ? url : `https://${url}` },
            };

            variation.url = null;

            didMigrate = true;
        });
    });

    if (!didMigrate) {
        return;
    }

    const repo = getRepoConnection({ repoId: req.repositoryId, branch: 'draft', asAdmin: true });

    repo.modify<Content<'no.nav.navno:form-details'>>({
        key: content._id,
        editor: (content) => {
            content.data.formType = formType;
            return content;
        },
    });
};

// TODO: This can be removed once all content of this type has been republished with the new data model
const formDetailsController = (req: XP.Request) => {
    if ((req.mode === 'edit' || req.mode === 'inline') && req.method === 'GET') {
        migrateOldUrlField(req);
    }

    return frontendProxy(req);
};

export const get = formDetailsController;
