import { getXpSessionCookie } from './xp-auth.mjs';
import { directLocalFetch, fetchXp } from './xp-http.mjs';

const getIconUrl = (serviceUrl, projectId) =>
    new URL(`/admin/rest-v2/cs/project/icon/${encodeURIComponent(projectId)}`, serviceUrl);

export const downloadProjectIcons = async ({
    sourceServiceUrl,
    projects,
    auth,
    fetchRequest = fetchXp,
    getSessionCookie = getXpSessionCookie,
}) => {
    if (projects.length === 0) {
        return [];
    }
    const cookie = await getSessionCookie(sourceServiceUrl, auth);
    const projectResponse = await fetchRequest(
        new URL('/admin/rest-v2/cs/project/list', sourceServiceUrl),
        { headers: { Cookie: cookie } }
    );
    if (!projectResponse.ok) {
        throw new Error(`Could not list project icons: ${projectResponse.status}`);
    }
    const sourceProjects = (await projectResponse.json()).projects;
    if (!Array.isArray(sourceProjects)) {
        throw new Error('Invalid Content Studio project list');
    }
    const icons = [];
    for (const project of projects) {
        const sourceProject = sourceProjects.find(({ name }) => name === project.id);
        if (!sourceProject) {
            throw new Error(
                `Project ${project.id} is missing from the Content Studio project list`
            );
        }
        // Content Studio renders language flags itself when there is no uploaded icon.
        // Calling the attachment endpoint for those projects returns HTTP 500 on XP7.
        if (!sourceProject.icon) {
            continue;
        }
        const response = await fetchRequest(getIconUrl(sourceServiceUrl, project.id), {
            headers: { Cookie: cookie },
        });
        if (!response.ok) {
            throw new Error(`Could not read icon for project ${project.id}: ${response.status}`);
        }
        icons.push({
            projectId: project.id,
            contentType: response.headers.get('content-type') || 'application/octet-stream',
            data: Buffer.from(await response.arrayBuffer()),
        });
    }
    return icons;
};

export const uploadProjectIcons = async ({
    targetServiceUrl,
    icons,
    auth,
    fetchRequest = directLocalFetch,
    getSessionCookie = getXpSessionCookie,
}) => {
    if (icons.length === 0) {
        return;
    }
    const cookie = await getSessionCookie(targetServiceUrl, auth);
    const url = new URL('/admin/rest-v2/cs/project/modifyIcon', targetServiceUrl);
    for (const icon of icons) {
        const form = new FormData();
        form.set('name', icon.projectId);
        form.set('scaleWidth', '512');
        form.set(
            'icon',
            new Blob([icon.data], { type: icon.contentType }),
            `${icon.projectId}-icon`
        );
        const response = await fetchRequest(url, {
            method: 'POST',
            headers: { Cookie: cookie },
            body: form,
        });
        if (!response.ok) {
            throw new Error(
                `Could not restore icon for project ${icon.projectId}: ${response.status}`
            );
        }
    }
};
