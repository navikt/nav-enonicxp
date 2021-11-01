const { getGlobalValue } = require('/lib/global-values/global-values');
const { getGvKeyAndContentIdFromUniqueKey } = require('/lib/global-values/global-values');
const { runInBranchContext } = require('/lib/headless/branch-context');
const { forceArray } = require('/lib/nav-utils');

const globalValueMacroConfigCallback = (context, params) => {
    params.fields.value = {
        resolve: (env) => {
            if (env.source.key) {
                log.info(`GV macro key: ${env.source.key}`);

                const { gvKey, contentId } = getGvKeyAndContentIdFromUniqueKey(env.source.key);
                return runInBranchContext(() => getGlobalValue(gvKey, contentId), 'master');
            }

            log.info(`GV macro value: ${env.source.value}`);

            return env.source.value;
        },
    };
};

const globalValueWithMathMacroConfigCallback = (context, params) => {
    params.fields.variables = {
        resolve: (env) => {
            if (env.source.keys) {
                const keys = forceArray(env.source.keys);

                const variables = runInBranchContext(
                    () =>
                        keys.reduce((acc, key) => {
                            const { gvKey, contentId } = getGvKeyAndContentIdFromUniqueKey(key);

                            const value = getGlobalValue(gvKey, contentId);
                            return value ? [...acc, value] : acc;
                        }, []),
                    'master'
                );

                // If any specified variables are missing, we return nothing to ensure
                // inconsistent/unintended calculations does not happen
                const hasMissingValues = keys.length !== variables.length;
                return hasMissingValues ? [] : variables;
            }

            return env.source.variables;
        },
    };
};

module.exports = {
    globalValueMacroConfigCallback,
    globalValueWithMathMacroConfigCallback,
};
