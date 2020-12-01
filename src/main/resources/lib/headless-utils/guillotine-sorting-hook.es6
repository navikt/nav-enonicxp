const graphQlLib = require('/lib/graphql');
const contentLib = require('/lib/xp/content');
const guillotineDynamicForm = require('/lib/guillotine/dynamic/form');
const { forceArray } = require('/lib/nav-utils');

const guillotineSortingHook = () => {
    const generateFormItemArgumentsPrev = guillotineDynamicForm.generateFormItemArguments;

    guillotineDynamicForm.generateFormItemArguments = (context, formItem) => {
        const args = generateFormItemArgumentsPrev(context, formItem);
        if (!formItem.occurrences || formItem.occurrences.maximum !== 1) {
            args.sort = graphQlLib.GraphQLString;
        }
        return args;
    };

    const generateFormItemResolveFunctionPrev =
        guillotineDynamicForm.generateFormItemResolveFunction;

    guillotineDynamicForm.generateFormItemResolveFunction = (formItem) => {
        const resolveFunctionPrev = generateFormItemResolveFunctionPrev(formItem);
        if (formItem?.occurrences?.maximum === 1) {
            return resolveFunctionPrev;
        }

        return (env) => {
            const sort = env?.args?.sort;

            if (!sort) {
                return resolveFunctionPrev(env);
            }

            const [sortBy, orderByRaw] = sort.split(' ');
            const orderBy = orderByRaw?.toUpperCase();

            if (!sortBy || (orderBy !== 'DESC' && orderBy !== 'ASC')) {
                return resolveFunctionPrev(env);
            }

            const values = forceArray(env.source[formItem.name]);
            const resolvedValues =
                formItem.formItemType.toLowerCase() === 'input' &&
                ['ContentSelector', 'MediaUploader', 'ImageSelector', 'MediaSelector'].indexOf(
                    formItem.inputType
                ) !== -1
                    ? values
                          .map(function (value) {
                              return contentLib.get({ key: value });
                          })
                          .filter(function (content) {
                              return content != null;
                          })
                    : values;

            const sortFunc = (a, b) => {
                const [fieldA, fieldB] =
                    orderBy === 'ASC' ? [a[sortBy], b[sortBy]] : [b[sortBy], a[sortBy]];

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

            const sortedValues = resolvedValues.sort(sortFunc).map((item) => item._id);

            const envWithSortedValues = {
                ...env,
                source: {
                    ...env.source,
                    [formItem.name]: sortedValues,
                },
            };

            return resolveFunctionPrev(envWithSortedValues);
        };
    };
};

module.exports = guillotineSortingHook;
