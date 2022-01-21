import { Content } from '/lib/xp/content';
import { Component } from '/lib/xp/portal';

type PortalFragment = Content & {
    fragment: Component<any>;
};

export const isFragment = (fragment: any): fragment is PortalFragment =>
    !!fragment.fragment;
