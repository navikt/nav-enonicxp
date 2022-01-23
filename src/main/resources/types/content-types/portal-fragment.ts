import { PortalComponent } from '../components/component-portal';
import { Content } from './content-config';

export type PortalFragment = Content & {
    type: 'portal:fragment';
    fragment: PortalComponent<'part' | 'layout'>;
};

export const isFragment = (fragment: any): fragment is PortalFragment =>
    !!fragment.fragment;
