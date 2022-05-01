import contentLib from '/lib/xp/content';
import graphQlLib, { GraphQLResolver } from '/lib/graphql';
import { Context } from '/lib/guillotine';
import macroLib from '/lib/guillotine/macro';
import { sanitizeText } from '/lib/guillotine/util/naming';
import { CreationCallback, graphQlCreateObjectType } from '../../utils/creation-callback-utils';
import { getKeyWithoutMacroDescription } from '../../../utils/component-utils';
import { HtmlAreaPartConfig } from '../../../../site/parts/html-area/html-area-part-config';

type MacroDescriptor = {
    name: string;
    applicationKey: string;
    form: any;
};

const getMacroDescriptors = (applicationsKeys: string[]): MacroDescriptor[] => {
    const descriptorBean = __.newBean(
        'com.enonic.lib.guillotine.handler.ComponentDescriptorHandler'
    );
    return __.toNativeObject(descriptorBean.getMacroDescriptors(applicationsKeys));
};

// Generates a special case of the RichText type where the html-fragment macro is not
// included in the macro config type. This is necessary in order to prevent circular
// references in the graphql schema, as this macro can itself contain other macros
// when resolved
//
// (this is largely derived from createMacroDataConfigType() in lib-guillotine)
const generateRichTextTypeWithoutHtmlFragment = (context: Context) => {
    const macroDescriptors = getMacroDescriptors(context.options.applications as string[]).filter(
        (descriptor) => descriptor.name !== 'html-fragment'
    );

    const macroConfigTypeFields = macroDescriptors.reduce(
        (macroConfigTypeFieldsAcc, descriptor) => {
            const sanitizeDescriptorName = sanitizeText(descriptor.name);

            const macroTypeName = `Macro_${sanitizeText(
                descriptor.applicationKey
            )}_${sanitizeDescriptorName}`;

            const macroDataConfigTypeName = `${macroTypeName}_DataConfig`;

            return {
                ...macroConfigTypeFieldsAcc,
                [sanitizeDescriptorName]: {
                    type: graphQlLib.reference(macroDataConfigTypeName),
                    resolve: (env) => {
                        return env.source[descriptor.name];
                    },
                },
            };
        },
        {} as Record<string, GraphQLResolver>
    );

    const macroConfigTypeModified = graphQlCreateObjectType(context, {
        name: `MacroConfigHtmlFragment`,
        description: `Macro config type modified for html-fragment`,
        fields: macroConfigTypeFields,
    });

    const macroTypeModified = graphQlCreateObjectType(context, {
        name: `MacroHtmlFragment`,
        description: `Macro type modified for html-fragment`,
        fields: {
            ref: {
                type: graphQlLib.GraphQLString,
                resolve: (env) => {
                    return env.source.ref;
                },
            },
            name: {
                type: graphQlLib.GraphQLString,
                resolve: (env) => {
                    return env.source.name;
                },
            },
            descriptor: {
                type: graphQlLib.GraphQLString,
                resolve: (env) => {
                    return env.source.descriptor;
                },
            },
            config: {
                type: macroConfigTypeModified,
                resolve: (env) => {
                    return env.source.config;
                },
            },
        },
    });

    return graphQlCreateObjectType(context, {
        name: 'RichTextHtmlFragment',
        description: 'RichText type for html-fragment',
        fields: {
            processedHtml: {
                type: graphQlLib.GraphQLString,
                resolve: (env) => {
                    return env.source.processedHtml;
                },
            },
            macros: {
                type: graphQlLib.list(macroTypeModified),
                resolve: (env) => {
                    return env.source.macrosAsJson;
                },
            },
            macrosAsJson: {
                type: graphQlLib.Json,
                resolve: (env) => {
                    return env.source.macrosAsJson;
                },
            },
        },
    });
};

export const macroHtmlFragmentCallback: CreationCallback = (context, params) => {
    params.fields.processedHtml = {
        type: generateRichTextTypeWithoutHtmlFragment(context),
        resolve: (env) => {
            const { fragmentId } = env.source;
            if (!fragmentId) {
                return null;
            }

            const key = getKeyWithoutMacroDescription(fragmentId);

            const content = contentLib.get({ key });
            if (!content) {
                log.warning(`Content not found for fragment in html-fragment macro: ${fragmentId}`);
                return null;
            }

            if (content.type !== 'portal:fragment') {
                log.warning(
                    `Content content specified for html-fragment macro is not a fragment: ${fragmentId}`
                );
                return null;
            }

            const html = (content.fragment?.config as HtmlAreaPartConfig)?.html;
            if (!html) {
                log.warning(`Fragment in html-fragment macro did not contain html: ${fragmentId}`);
                return null;
            }

            return macroLib.processHtml({
                type: 'server',
                value: html,
            });
        },
    };
};
