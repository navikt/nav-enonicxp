import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import graphQlLib from '/lib/graphql';
import { CreationCallback } from '../../utils/creation-callback-utils';
import { forceArray } from '../../../utils/nav-utils';

export const videoCallback: CreationCallback = (context, params) => {
    log.info('videoCallback');
    params.fields.video.args = { baseContentId: graphQlLib.GraphQLID };
    params.fields.video.resolve = (env) => {
        log.info(env.args.baseContentId);
        log.info('videoCallback resolve');
        return env.source;
    };
};
