import { Content } from '/lib/xp/content';
import { forceArray } from '../utils/array-utils';

export const isContentLocalized = (content: Content) =>
    !forceArray(content.inherit).includes('CONTENT');
