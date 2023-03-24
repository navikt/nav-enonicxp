import * as contentLib from '/lib/xp/content';
import { getRepoConnection } from '../../utils/repo-utils';
import { RepoBranch } from '../../../types/common';
import { getLayersData } from '../layers-data';
import { logger } from '../../utils/logging';
import { runInLocaleContext } from '../locale-context';

type Params = {
    key: string;
    locale: string;
    branch: RepoBranch;
    editorFunc: <Type = unknown>(content?: Type) => Type;
};

// Modifies a content node, while ensuring property types are valid according to the content type schema
export const modifyContentNode = ({ key, locale, branch, editorFunc }: Params) => {
    const { localeToRepoIdMap } = getLayersData();

    const targetRepo = getRepoConnection({
        branch,
        repoId: localeToRepoIdMap[locale],
        asAdmin: true,
    });

    const targetLogString = `[${locale}] ${key} in branch ${branch}`;

    // We need to modify the content in two stages to get a valid result. First do a complete copy of
    // the content node from the source to the target, using the node library. This includes every field
    // of the node object, including the complete components array.
    // However, this does not preserve spesial string field types, such as Reference or Datetime.
    // These will be indexed as plain strings on the target node.
    const nodeModifyResult = targetRepo.modify({
        key: key,
        editor: editorFunc,
    });
    if (!nodeModifyResult) {
        logger.error(`Failed to modify content ${targetLogString} (stage 1)`);
        return false;
    }

    // Do a second pass with the content library, where we perform no mutation of the content on our own.
    // The contentLib function will set the correct types on every field according to the content-type
    // schema for the modified content.
    const contentModifyResult = runInLocaleContext({ locale: locale, asAdmin: true, branch }, () =>
        contentLib.modify({
            key: key,
            editor: (content) => content,
        })
    );
    if (!contentModifyResult) {
        logger.error(`Failed to modify content ${targetLogString} (stage 2)`);
        return false;
    }

    return true;
};
