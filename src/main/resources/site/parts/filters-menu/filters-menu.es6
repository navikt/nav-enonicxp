const controller = require('/lib/headless/controllers/component-preview-controller');

exports.get = (req) => {
    if (req.mode === 'edit') {
        const contentId = portalLib.getContent()._id;
        const component = portalLib.getComponent();

        const repo = nodeLib.connect({
            repoId: req.repositoryId,
            branch: req.branch,
        });

        const content = repo.get(contentId);

        if (!componentHasUniqueAnchorId(content, component)) {
            repo.modify({
                key: contentId,
                editor: generateAnchorIdFromTitle(component.path),
            });
        }
    }

    return controller;
};
