import { CreationCallback } from '../../utils/creation-callback-utils';

export const contentInterfaceCallback: CreationCallback = (context, params) => {
    params.fields._path.resolve = (env) => {
        const { _path, data } = env.source;
        return data?.customPath || _path;
    };
};
