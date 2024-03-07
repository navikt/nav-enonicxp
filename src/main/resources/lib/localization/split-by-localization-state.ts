import { Content } from '/lib/xp/content';
import { isContentLocalized } from './locale-utils';

type ContentByLocalizationState<ContentType extends Content> = {
    localized: ContentType[];
    nonLocalized: ContentType[];
};

export const splitByLocalizationState = <ContentType extends Content>(
    contents: ContentType[],
    language: string
): ContentByLocalizationState<ContentType> => {
    const localized: ContentType[] = [];
    const nonLocalized: ContentType[] = [];

    contents.forEach((content) => {
        if (isContentLocalized(content) && content.language === language) {
            localized.push(content);
        } else {
            nonLocalized.push(content);
        }
    });

    return { localized, nonLocalized };
};
