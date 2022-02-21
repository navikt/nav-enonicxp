import thymeleafLib from '/lib/thymeleaf';
import nodeLib from '/lib/xp/node';
import { sanitize } from '/lib/xp/common';
import contentLib from '/lib/xp/content';
import { urls } from '../../../lib/constants';
import { forceArray, getParentPath } from '../../../lib/utils/nav-utils';
import { validateCurrentUserPermissionForContent } from '../../../lib/utils/auth-utils';

const mainView = resolve('./views/index.html');
const selectView = resolve('./views/restore-select.html');
const resultView = resolve('./views/restore-result.html');

type ArchiveEntry = {
    name: string;
    id: string;
};

const queryArchive = ({ query, repoId }: { query?: string; repoId: string }): ArchiveEntry[] => {
    const repo = nodeLib.connect({ repoId, branch: 'draft' });

    const queryString = `_path LIKE "/archive/*"${
        query ? ` AND fulltext("displayName, _path", "${sanitize(query)}*", "AND")` : ''
    }`;

    const archivedContentIds = repo
        .query({
            count: 10000,
            query: queryString,
        })
        .hits.map((node) => node.id);

    const archivedContents = repo.get(archivedContentIds);

    return forceArray(archivedContents).reduce((acc, content) => {
        if (!validateCurrentUserPermissionForContent(undefined, 'PUBLISH', content._permissions)) {
            return acc;
        }

        return [
            ...acc,
            {
                name: `${content.displayName} [${content._path.replace('/archive', '')}]`,
                id: content._id,
            },
        ];
    }, []);
};

const restoreFromArchive = (
    selectedContentId: string,
    targetId: string
): { success: boolean; message: string } => {
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
            return { success: false, message: 'Feil: det arkiverte innholdet ble ikke funnet' };
        }

        const restoredContent = contentLib.get({ key: restoredId });
        if (!restoredContent) {
            return { success: false, message: 'Feil: gjenoppretting fra arkiv mislykkes' };
        }

        // The target path for restore seems to be inconsistently ignored. Workaround for this bug.
        if (getParentPath(restoredContent._path) !== targetPath) {
            log.warning(
                `Content (${restoredId}) was not restored to the selected path (${targetPath}), fixing...`
            );
            contentLib.move({ source: restoredContent._id, target: targetPath });
        }

        log.info(`Restored from archive: ${JSON.stringify(restoredContent)} -> ${targetPath}`);

        return {
            success: true,
            message: `Gjenoppretting av "${restoredContent.displayName}" var vellykket`,
        };
    } catch (e) {
        return { success: false, message: 'Feil:  det arkiverte innholdet ble ikke funnet' };
    }
};

export const get = (req: XP.Request) => {
    const { repositoryId, path } = req;
    const { contentId, query, selectedContent } = req.params;

    const widgetUrl = `${urls.portalAdminOrigin}${path}`;

    if (!contentId) {
        return {
            body: '<widget>Ukjent feil - forsøk å laste inn på nytt</widget>',
            contentType: 'text/html',
        };
    }

    if (!validateCurrentUserPermissionForContent(contentId, 'PUBLISH')) {
        return {
            body: '<widget>Du har ikke tilgang til å gjenopprette til denne mappen. Velg en mappe der du har publiseringstilgang.</widget>',
            contentType: 'text/html',
        };
    }

    if (query !== undefined) {
        const archiveEntries = queryArchive({ query, repoId: repositoryId });

        const model = {
            widgetUrl,
            contentId,
            archiveEntries: archiveEntries.length > 0 ? archiveEntries : null,
        };

        return {
            body: thymeleafLib.render(selectView, model),
            contentType: 'text/html',
        };
    }

    if (selectedContent !== undefined) {
        const { success, message } = restoreFromArchive(selectedContent, contentId);

        const model = {
            success,
            message,
        };

        log.info(
            `Restore from archive ${
                success ? 'succeeded' : 'failed'
            } for ${selectedContent} -> ${contentId} - ${message}`
        );

        return {
            body: thymeleafLib.render(resultView, model),
            contentType: 'text/html',
        };
    }

    const model = {
        widgetUrl,
        contentId,
    };

    return {
        body: thymeleafLib.render(mainView, model),
        contentType: 'text/html',
    };
};
