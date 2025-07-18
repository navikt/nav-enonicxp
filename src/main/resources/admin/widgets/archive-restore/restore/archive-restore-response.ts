import { Request, Response } from '@enonic-types/core'
import * as contentLib from '/lib/xp/content';
import thymeleafLib from '/lib/thymeleaf';
import { runInContext } from '../../../../lib/context/run-in-context';
import { logger } from '../../../../lib/utils/logging';
import { getParentPath } from '../../../../lib/paths/path-utils';

const view = resolve('./archive-restore-response.html');

const restoreFromArchive = (
    selectedContentId: string,
    targetId: string
): { success: boolean; message: string } =>
    runInContext({ branch: 'draft', asAdmin: true }, () => {
        const targetPath = contentLib.get({ key: targetId })?._path;
        if (!targetPath) {
            return { success: false, message: 'Feil: kunne ikke gjenopprette til denne mappen' };
        }

        // contentLib.restore throws if content does not exist in the archive
        try {
            const restoredId = contentLib.restore({
                content: selectedContentId,
                path: targetPath,
            })?.[0];
            if (!restoredId) {
                return {
                    success: false,
                    message: 'Feil: det valgte innholdet ble ikke funnet i arkivet',
                };
            }

            const restoredContent = contentLib.get({ key: restoredId });
            if (!restoredContent) {
                return { success: false, message: 'Feil: gjenoppretting fra arkiv mislykkes' };
            }

            // Workaround for a bug where the target path for restore is occasionally ignored
            if (getParentPath(restoredContent._path) !== targetPath) {
                logger.warning(
                    `Content (${restoredId}) was not restored to the selected path (${targetPath}), moving the content...`
                );
                contentLib.move({
                    source: restoredContent._id,
                    target: `${targetPath}${targetPath.endsWith('/') ? '' : '/'}`,
                });
            }

            return {
                success: true,
                message: `Gjenoppretting av "${restoredContent.displayName}" var vellykket`,
            };
        } catch (e) {
            logger.warning(`Archive restore exception: ${e}`);
            return {
                success: false,
                message: 'Feil: det valgte innholdet ble ikke funnet i arkivet',
            };
        }
    });

export const archiveRestoreResponse = (req: Request) : Response => {
    const contentId = req.params.contentId as string;
    const selectedContent = req.params.selectedContent as string;

    if (!selectedContent || !contentId) {
        return {
            body: '<span>Ingen innhold valgt</span>',
            contentType: 'text/html; charset=UTF-8',
        };
    }

    const { success, message } = restoreFromArchive(selectedContent, contentId);
    const model = {
        success,
        message,
    };

    logger.info(
        `Restore from archive ${
            success ? 'succeeded' : 'failed'
        } for ${selectedContent} -> ${contentId} - ${message}`
    );

    return {
        body: thymeleafLib.render(view, model),
        contentType: 'text/html; charset=UTF-8',
    };
};
