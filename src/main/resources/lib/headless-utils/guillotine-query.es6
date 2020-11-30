const guillotineLib = require('/lib/guillotine');
const graphQlLib = require('/lib/graphql');
const { runInBranchContext } = require('/lib/headless-utils/run-in-context');
const guillotineDynamicForm = require('/lib/guillotine/dynamic/form');
const { forceArray } = require('/lib/nav-utils');

// lol wut
const sortAllContentArraysHook = () => {
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
            log.info('oh noes 1');
            return resolveFunctionPrev;
        }

        return (env) => {
            const sort = env?.args?.sort;

            if (!sort) {
                log.info('oh noes 2');
                return resolveFunctionPrev(env);
            }

            const [sortBy, orderByRaw] = sort.split(' ');
            const orderBy = orderByRaw?.toUpperCase();

            if (!sortBy || (orderBy !== 'DESC' && orderBy !== 'ASC')) {
                log.info('oh noes 3');
                return resolveFunctionPrev(env);
            }

            const values = forceArray(env.source[formItem.name]);

            log.info(JSON.stringify(values));

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

            const envWithSortedValues = {
                ...env,
                source: { ...env.source, [formItem.name]: values.sort(sortFunc) },
            };

            log.info(JSON.stringify(envWithSortedValues));

            return resolveFunctionPrev(envWithSortedValues);
        };
    };
};

sortAllContentArraysHook();

const schema = guillotineLib.createSchema({
    creationCallbacks: {
        no_nav_navno_ContentList_Data: function (context, params) {
            log.info(`things: ${JSON.stringify(params)}`);
            params.fields.derp = {
                type: graphQlLib.GraphQLString,
                resolve: function (env) {
                    return 'hi';
                },
            };
            params.fields.sectionContents.args = {
                ...params.fields.sectionContents.args,
                sort: graphQlLib.GraphQLString,
            };
        },
    },
});

const guillotineQuery = (query, params, branch = 'master') => {
    const queryResponse = runInBranchContext(
        () => graphQlLib.execute(schema, query, params),
        branch
    );

    const { data, errors } = queryResponse;

    if (errors) {
        log.error('GraphQL errors:');
        errors.forEach((error) => log.error(error.message));
    }

    return data?.guillotine;
};

module.exports = guillotineQuery;
