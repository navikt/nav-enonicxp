import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import { getRepoConnection } from '../../repos/repo-utils';
import { logger } from '../../utils/logging';
import { runInLocaleContext } from '../locale-context';
import { ModifyNodeParams } from '/lib/xp/node';
import { getLayersData } from '../layers-data';

type Params = {
    repoId: string;
    requireValid?: boolean;
} & ModifyNodeParams;

// Ensure a mutation of the content occurs, in order to force the content api
// to always trigger a database update
const insertDummyData = (content: Content<any>) => {
    if (!content.data) {
        content.data = {};
    }

    content.data._dummy = new Date().toISOString();

    return content;
};

// Modifies a content node, while ensuring property types are valid according to the content type schema
export const modifyContentNode = ({ key, repoId, editor, requireValid }: Params) => {
    const targetRepo = getRepoConnection({
        branch: 'draft',
        repoId,
        asAdmin: true,
    });

    const targetLogString = `[${repoId}] ${key}`;

    // We need to modify the content in two stages to get a valid result. First do a complete copy of
    // the content node from the source to the target, using the node library. This includes every field
    // of the node object, including the complete components array.
    // However, this does not preserve spesial string field types, such as Reference or Datetime.
    // These will be indexed as plain strings on the target node.
    try {
        const nodeModifyResult = targetRepo.modify({
            key,
            editor,
        });
        if (!nodeModifyResult) {
            logger.error(`Failed to modify content ${targetLogString} (stage 1)`);
            return false;
        }

        logger.info(`Modify content ${targetLogString} succeeded (stage 1)`);
    } catch (e) {
        logger.error(`Failed to modify content ${targetLogString} (stage 1 exception) ${e}`);
        return false;
    }

    const locale = getLayersData().repoIdToLocaleMap[repoId];

    // Do a second pass with the content library, where we perform no mutation of the content on our own.
    // The contentLib function will set the correct types on every field according to the content-type
    // schema for the modified content.
    try {
        const contentModifyResult = runInLocaleContext(
            { locale, asAdmin: true, branch: 'draft' },
            () =>
                contentLib.modify({
                    requireValid,
                    key,
                    editor: (content) => {
                        return insertDummyData(content);
                    },
                })
        );
        if (!contentModifyResult) {
            logger.error(`Failed to modify content ${targetLogString} (stage 2)`);
            return false;
        }

        logger.info(`Modify content ${targetLogString} succeeded (stage 2)`);
    } catch (e) {
        logger.error(`Failed to modify content ${targetLogString} (stage 2 exception) ${e}`);
        return false;
    }

    return true;
};
