const graphQlLib = require('/lib/graphql');
const contentLib = require('/lib/xp/content');
const guillotineDynamicForm = require('/lib/guillotine/dynamic/form');
const { forceArray } = require('/lib/nav-utils/index');
const { processHtmlWithPostProcessing } = require('/lib/headless/controllers/html-processor');

const getSortFunc = (sortByField, order) => (a, b) => {
    const [fieldA, fieldB] =
        order === 'ASC' ? [a[sortByField], b[sortByField]] : [b[sortByField], a[sortByField]];

    if (!fieldA && !fieldB) {
        return 0;
    }

    if (fieldA > fieldB || !fieldB) {
        return 1;
    }

    if (fieldA < fieldB || !fieldA) {
        return -1;
    }

    return 0;
};

const sortFormItemValues = (env, formItem) => {
    const sort = env?.args?.sort;

    if (!sort) {
        return env;
    }

    const [sortBy, orderRaw] = sort.split(' ');
    const order = orderRaw?.toUpperCase();

    if (!sortBy || (order !== 'DESC' && order !== 'ASC')) {
        return env;
    }

    const values = forceArray(env.source[formItem.name]);
    const resolvedValues =
        formItem.formItemType.toLowerCase() === 'input' &&
        ['ContentSelector', 'MediaUploader', 'ImageSelector', 'MediaSelector'].indexOf(
            formItem.inputType
        ) !== -1
            ? values
                  .map((value) => contentLib.get({ key: value }))
                  .filter((content) => content != null)
            : values;

    const sortFunc = getSortFunc(sortBy, order);
    const sortedValues = resolvedValues.sort(sortFunc).map((item) => item._id);

    return {
        ...env,
        source: {
            ...env.source,
            [formItem.name]: sortedValues,
        },
    };
};

const hookGenerateFormItemWithSortArgument = () => {
    const generateFormItemArgumentsPrev = guillotineDynamicForm.generateFormItemArguments;

    guillotineDynamicForm.generateFormItemArguments = (context, formItem) => {
        const args = generateFormItemArgumentsPrev(context, formItem);
        if (!formItem.occurrences || formItem.occurrences.maximum !== 1) {
            args.sort = graphQlLib.GraphQLString;
        }
        return args;
    };
};

const hookGenerateFormItemResolver = () => {
    const generateFormItemResolveFunctionPrev =
        guillotineDynamicForm.generateFormItemResolveFunction;

    guillotineDynamicForm.generateFormItemResolveFunction = (formItem) => {
        const resolveFunctionPrev = generateFormItemResolveFunctionPrev(formItem);

        // if formItem can not have an array of values, do not attempt to sort
        if (formItem?.occurrences?.maximum === 1) {
            return (env) => {
                const value = env.source[formItem.name];

                if (value && env.args.processHtml) {
                    return processHtmlWithPostProcessing(value, env.args.processHtml.type);
                }

                return resolveFunctionPrev(env);
            };
        }

        return (env) => {
            const envWithSortedValues = sortFormItemValues(env, formItem);

            if (env.args.processHtml) {
                const values = envWithSortedValues.source[formItem.name];
                return values.map((value) =>
                    processHtmlWithPostProcessing(value, env.args.processHtml.type)
                );
            }

            return resolveFunctionPrev(envWithSortedValues);
        };
    };
};

const guillotineHooks = () => {
    hookGenerateFormItemWithSortArgument();
    hookGenerateFormItemResolver();
};

module.exports = guillotineHooks;
