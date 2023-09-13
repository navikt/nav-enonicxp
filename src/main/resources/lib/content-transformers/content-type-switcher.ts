import { Content } from '/lib/xp/content';
import { logger } from '../utils/logging';
import { getLayersData } from '../localization/layers-data';
import { getRepoConnection } from '../utils/repo-utils';
import { isContentLocalized } from '../localization/locale-utils';
import { NodeModifyParams } from '/lib/xp/node';

const setContentTypeOnInheritedContent = (
    contentId: string,
    repoId: string,
    contentType: string
) => {
    const { defaultLocale, repoIdToLocaleMap, localeToRepoIdMap, locales } = getLayersData();

    const selectedLocale = repoIdToLocaleMap[repoId];
    if (selectedLocale !== defaultLocale) {
        return;
    }

    locales.forEach((locale) => {
        if (locale === selectedLocale) {
            return;
        }

        const localizedRepo = localeToRepoIdMap[locale];

        const repoConnection = getRepoConnection({
            repoId: localizedRepo,
            branch: 'draft',
            asAdmin: true,
        });

        const content = repoConnection.get<Content>(contentId);
        if (!content || isContentLocalized(content)) {
            return;
        }

        repoConnection.modify({
            key: contentId,
            editor: (contentNode) => {
                contentNode.type = contentType;
                return contentNode;
            },
        });
    });
};

type Params = {
    repoId: string;
    contentId: string;
    contentType: string;
    editor?: NodeModifyParams['editor'];
};

export const switchContentType = ({ repoId, contentId, contentType, editor }: Params) => {
    try {
        setContentTypeOnInheritedContent(contentId, repoId, contentType);

        const repo = getRepoConnection({
            repoId: repoId,
            branch: 'draft',
            asAdmin: true,
        });

        const result = repo.modify({
            key: contentId,
            editor: (content) => {
                if (editor) {
                    editor(content);
                }

                content.type = contentType;

                return content;
            },
        });

        logger.info(`Changed content type for ${contentId} in ${repoId} to ${contentType}`);

        return !!result;
    } catch (e) {
        logger.error(
            `Error while attempting to change content type for ${contentId} to ${contentType} - ${e}`
        );

        return false;
    }
};
