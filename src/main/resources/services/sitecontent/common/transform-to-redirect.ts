import { Content } from '/lib/xp/content';

export const transformToRedirect = ({
    content,
    target,
    type,
    isPermanent = false,
}: {
    content: Content;
    target: string;
    type: 'internal' | 'external';
    isPermanent?: boolean;
}) => {
    // We don't want every field from the raw content in the response, ie creator/modifier ids and other
    // fields purely for internal use
    const { _id, _path, createdTime, modifiedTime, displayName, language, publish } = content;

    const contentCommon = {
        _id,
        _path,
        createdTime,
        modifiedTime,
        displayName,
        language,
        publish,
        page: {},
    };

    return type === 'internal'
        ? {
              ...contentCommon,
              type: 'no.nav.navno:internal-link',
              data: {
                  target: { _path: target },
                  permanentRedirect: isPermanent,
                  redirectSubpaths: false,
              },
          }
        : {
              ...contentCommon,
              type: 'no.nav.navno:external-link',
              data: {
                  url: target,
                  permanentRedirect: isPermanent,
              },
          };
};
