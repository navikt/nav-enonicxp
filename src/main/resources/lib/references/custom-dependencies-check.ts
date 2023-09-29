import { Content } from '/lib/xp/content';
import { CONTENT_ROOT_PROJECT_ID, CONTENT_STUDIO_PATH_PREFIX } from '../constants';
import { runInLocaleContext } from '../localization/locale-context';
import { isValidLocale } from '../localization/layers-data';

export type DependenciesCheckParams = Partial<{
    id: string;
    layer: string;
}>;

export type DependencyData = {
    name: string;
    path: string;
    editorPath: string;
    id: string;
};

export const transformToCustomDependencyData = (
    content: Content,
    projectId = CONTENT_ROOT_PROJECT_ID
): DependencyData => ({
    name: content.displayName,
    path: content._path,
    editorPath: `${CONTENT_STUDIO_PATH_PREFIX}/${projectId}/edit/${content._id}`,
    id: content._id,
});

type Callback = (contentId: string, contentLayer?: string) => Content[] | null;

type Params = {
    req: XP.Request;
    generalCallback?: Callback;
    componentsCallback?: Callback;
    macrosCallback?: Callback;
};

export const dependenciesCheckHandler = ({
    req,
    generalCallback,
    componentsCallback,
    macrosCallback,
}: Params) => {
    const { id, layer } = req.params as DependenciesCheckParams;

    if (!id || !isValidLocale(layer)) {
        return {
            status: 400,
            body: {
                message: `Invalid parameters for dependencies check (id: ${id} - layer: ${layer})`,
            },
        };
    }

    const body = runInLocaleContext({ locale: layer, branch: 'master', asAdmin: true }, () => ({
        ...(generalCallback && { general: generalCallback(id, layer) }),
        ...(componentsCallback && { components: componentsCallback(id, layer) }),
        ...(macrosCallback && { macros: macrosCallback(id, layer) }),
    }));

    return {
        status: 200,
        contentType: 'application/json',
        body,
    };
};
