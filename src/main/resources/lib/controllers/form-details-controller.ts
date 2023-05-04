import * as portalLib from '/lib/xp/portal';
import { Content } from '/lib/xp/content';
import { frontendProxy } from './frontend-proxy';
import { forceArray } from '../utils/array-utils';
import { logger } from '../utils/logging';
import { getRepoConnection } from '../utils/repo-utils';

const migrateOldUrlField = (req: XP.Request) => {
    const content = portalLib.getContent();
    if (content?.type !== 'no.nav.navno:form-details') {
        return;
    }

    const formType = forceArray(content.data?.formType);

    const didMigrate = formType.some((formTypeField) => {
        const { _selected } = formTypeField;
        const variations = forceArray((formTypeField as any)[_selected].variations);
        return variations.some((variation) => {
            if (!variation.url) {
                return false;
            }

            variation._selected = 'external';
            variation.external = { url: variation.url };
            variation.url = null;

            return true;
        });
    });

    if (!didMigrate) {
        return;
    }

    const repo = getRepoConnection({ repoId: req.repositoryId, branch: 'draft', asAdmin: true });

    repo.modify<Content<'no.nav.navno:form-details'>>({
        key: content._id,
        editor: (content) => {
            logger.info(`Migrating formtype from ${JSON.stringify(content.data.formType)}`);
            logger.info(`Migrating formtype to ${JSON.stringify(formType)}`);
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
