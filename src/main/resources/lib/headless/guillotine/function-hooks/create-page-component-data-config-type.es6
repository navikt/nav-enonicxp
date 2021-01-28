const graphQlLib = require('/lib/guillotine/graphql');
const namingLib = require('/lib/guillotine/util/naming');
const formLib = require('/lib/guillotine/dynamic/form');
const guillotineDynamicPageTypes = require('/lib/guillotine/dynamic/page-types');

// Replaces the default function with something that generates predictable type names
const hookCreatePageComponentDataConfigType = () => {
    guillotineDynamicPageTypes.createPageComponentDataConfigType = createPageComponentDataConfigType;
};

const generateDescriptorConfigTypeName = (componentType, descriptorName) =>
    `${componentType}Config${namingLib.generateCamelCase(descriptorName, true)}`;

const getDescriptors = (componentType, applicationKey) => {
    const bean = __.newBean('com.enonic.lib.guillotine.' + componentType + 'DescriptorServiceBean');
    return __.toNativeObject(bean.getByApplication(applicationKey));
};

const createDescriptorTypes = (descriptors, context, componentType) =>
    descriptors
        .filter((item) => item.form && item.form.length > 0)
        .reduce((types, descriptor) => {
            const descriptorConfigTypeName = generateDescriptorConfigTypeName(
                componentType,
                descriptor.name
            );

            const descriptorFields = formLib
                .getFormItems(descriptor.form)
                .reduce((fields, formItem) => {
                    const fieldKey = namingLib.sanitizeText(formItem.name);
                    return {
                        ...fields,
                        [fieldKey]: {
                            type: formLib.generateFormItemObjectType(
                                context,
                                descriptorConfigTypeName,
                                formItem
                            ),
                            args: formLib.generateFormItemArguments(context, formItem),
                            resolve: formLib.generateFormItemResolveFunction(formItem),
                        },
                    };
                }, {});

            const descriptorConfigType = graphQlLib.createObjectType(context, {
                name: descriptorConfigTypeName,
                description: `${componentType} config for ${descriptor.name}`,
                fields: descriptorFields,
            });

            const descriptorKey = namingLib.sanitizeText(descriptor.name);
            return {
                ...types,
                [descriptorKey]: {
                    type: descriptorConfigType,
                    resolve: (env) => env.source[descriptor.name],
                },
            };
        }, {});

const createComponentConfigsType = (context, componentType) => {
    const componentTypeAppConfigs = context.options.applications.reduce((appConfigs, app) => {
        const descriptorTypes = createDescriptorTypes(
            getDescriptors(componentType, app),
            context,
            componentType
        );

        if (Object.keys(descriptorTypes).length > 0) {
            const appKey = namingLib.sanitizeText(app);
            const appConfigType = graphQlLib.createObjectType(context, {
                name: `${componentType}ComponentConfigs`,
                description: `${componentType} component application config for application [${app}]`,
                fields: descriptorTypes,
            });

            return {
                ...appConfigs,
                [appKey]: {
                    type: appConfigType,
                    resolve: (env) => env.source[namingLib.applicationConfigKey(app)],
                },
            };
        }

        return appConfigs;
    }, {});

    if (Object.keys(componentTypeAppConfigs).length > 0) {
        context.types[`${componentType}ComponentDataConfigType`] = graphQlLib.createObjectType(
            context,
            {
                name: `${componentType}ComponentAppConfigs`,
                description: `${componentType} component configs.`,
                fields: componentTypeAppConfigs,
            }
        );
    }
};

const createPageComponentDataConfigType = (context) => {
    createComponentConfigsType(context, 'Page');
    createComponentConfigsType(context, 'Part');
    createComponentConfigsType(context, 'Layout');
};

module.exports = hookCreatePageComponentDataConfigType;
