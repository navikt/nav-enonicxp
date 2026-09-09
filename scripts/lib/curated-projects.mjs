const formatProductionCopyDate = (generatedAt) => {
    const date = new Date(generatedAt);
    if (Number.isNaN(date.getTime())) {
        throw new Error(`Invalid manifest generation date: ${generatedAt}`);
    }
    return new Intl.DateTimeFormat('nb-NO', {
        day: 'numeric',
        month: 'long',
        timeZone: 'UTC',
    }).format(date);
};

const getBaseDisplayName = (project) =>
    (project.displayName || project.id).replace(
        / \([^)]+\)(?: - (?:kopi|utvalg fra) prod .+)?$/,
        ''
    );

const getExistingProductionCopyDate = (project) =>
    (project.displayName || '').match(/ - (?:kopi|utvalg fra) prod (.+)$/)?.[1];

export const labelCuratedProjects = (projects, generatedAt) => {
    const generatedCopyDate = formatProductionCopyDate(generatedAt);
    const defaultCopyDate = getExistingProductionCopyDate(projects[0]) || generatedCopyDate;
    return projects.map((project, index) => ({
        ...project,
        displayName:
            index === 0
                ? `${getBaseDisplayName(project)} (dev) - utvalg fra prod ${defaultCopyDate}`
                : getBaseDisplayName(project),
    }));
};