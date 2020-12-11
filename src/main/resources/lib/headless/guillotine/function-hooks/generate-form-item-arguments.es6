const graphQlLib = require('/lib/graphql');
const guillotineDynamicForm = require('/lib/guillotine/dynamic/form');

// Adds sort argument to all form lists
const hookGenerateFormItem = () => {
    const generateFormItemArgumentsPrev = guillotineDynamicForm.generateFormItemArguments;

    guillotineDynamicForm.generateFormItemArguments = (context, formItem) => {
        const args = generateFormItemArgumentsPrev(context, formItem);
        if (!formItem.occurrences || formItem.occurrences.maximum !== 1) {
            args.sort = graphQlLib.GraphQLString;
        }
        return args;
    };
};

module.exports = hookGenerateFormItem;
