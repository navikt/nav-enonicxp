export const generateSearchDocumentId = (contentId: string, locale: string) =>
    `${contentId}-${locale}`;
