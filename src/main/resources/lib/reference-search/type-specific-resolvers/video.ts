import { findContentsWithText } from '../../utils/htmlarea-utils';

export const findVideoReferences = (contentId: string) => {
    return findContentsWithText(`video targetContent=\\"${contentId}\\"`);
};
