const getExistingNodeId = (error) =>
    String(error).match(/Node ([^ ]+) already exists/)?.[1] ?? null;

export const isDeferredRelocationError = (error, deferredContentIds) => {
    const contentId = getExistingNodeId(error);
    return contentId !== null && deferredContentIds.includes(contentId);
};
