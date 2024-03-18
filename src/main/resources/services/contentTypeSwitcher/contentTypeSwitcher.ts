import * as contentLib from '/lib/xp/content';
import { ContentType, Content } from '/lib/xp/content';
import { validateCurrentUserPermissionForContent } from '../../lib/utils/auth-utils';
import { contentTypesInContentSwitcher } from '../../lib/contenttype-lists';
import { logger } from '../../lib/utils/logging';
import { switchContentType } from '../../lib/content-transformers/content-type-switcher';
import { applyModifiedData } from '../../lib/utils/content-utils';
import { hasValidCustomPath } from '../../lib/paths/custom-paths/custom-path-utils';
import { ContentDescriptor } from '../../types/content-types/content-config';

type FormItem = contentLib.FormItem & { items?: contentLib.FormItem[] };

const contentTypesSet: ReadonlySet<ContentDescriptor> = new Set(contentTypesInContentSwitcher);

const contentHasField = (contentSchema: ContentType, fieldName: string) => {
    return contentSchema.form.some((form: FormItem) => {
        if (form.items) {
            return !!form.items?.find((item: FormItem) => item.name === fieldName);
        }
        return form.name === fieldName;
    });
};

type Params = Partial<{
    repoId: string;
    contentId: string;
    contentType: ContentDescriptor;
    wipeData: string;
    wipeComponents: string;
}>;

export const get = (req: XP.Request) => {
    const { repoId, contentId, contentType, wipeData, wipeComponents } = req.params as Params;

    if (!repoId || !contentId || !contentType) {
        logger.warning(
            `Malformed content-type switch request occured - repoId: ${repoId} - contentId: ${contentId} - contentType: ${contentType}`
        );
        return {
            status: 400,
        };
    }

    if (!validateCurrentUserPermissionForContent(contentId, 'PUBLISH')) {
        logger.warning(
            `Unauthorized content-type switch request occured - repoId: ${repoId} - contentId: ${contentId} - contentType: ${contentType}`
        );
        return {
            status: 401,
        };
    }

    if (!contentTypesSet.has(contentType)) {
        logger.warning(
            `Attempted to switch to a content type that is not allowed - repoId: ${repoId} - contentId: ${contentId} - contentType: ${contentType}`
        );
        return {
            status: 400,
        };
    }

    switchContentType({
        repoId,
        contentId,
        contentType,
        editor: (content) => {
            const contentSchema = contentLib.getType(contentType);

            if (!contentSchema) {
                throw new Error(`Content type ${contentType} does not exist`);
            }

            if (wipeComponents === 'true') {
                content.components = [];
            }

            if (wipeData === 'true') {
                if (hasValidCustomPath(content) && contentHasField(contentSchema, 'customPath')) {
                    (content.data as any) = { customPath: content.data.customPath };
                } else {
                    content.data = {};
                }
            }

            return applyModifiedData(content);
        },
    });

    return {
        status: 204,
    };
};
