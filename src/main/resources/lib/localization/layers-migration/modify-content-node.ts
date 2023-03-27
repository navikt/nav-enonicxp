import * as contentLib from '/lib/xp/content';
import { getRepoConnection } from '../../utils/repo-utils';
import { logger } from '../../utils/logging';
import { runInLocaleContext } from '../locale-context';
import { NodeModifyParams } from '/lib/xp/node';
import { getLayersData } from '../layers-data';

type Params = {
    repoId: string;
    requireValid?: boolean;
} & NodeModifyParams;

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
    const nodeModifyResult = targetRepo.modify({
        key,
        editor,
    });
    if (!nodeModifyResult) {
        logger.error(`Failed to modify content ${targetLogString} (stage 1)`);
        return false;
    }

    const locale = getLayersData().repoIdToLocaleMap[repoId];

    // Do a second pass with the content library, where we perform no mutation of the content on our own.
    // The contentLib function will set the correct types on every field according to the content-type
    // schema for the modified content.
    const contentModifyResult = runInLocaleContext({ locale, asAdmin: true, branch: 'draft' }, () =>
        contentLib.modify({
            requireValid,
            key,
            editor: (content) => content,
        })
    );
    if (!contentModifyResult) {
        logger.error(`Failed to modify content ${targetLogString} (stage 2)`);
        return false;
    }

    return true;
};
