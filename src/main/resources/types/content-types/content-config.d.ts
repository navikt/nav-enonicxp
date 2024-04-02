import { Component } from '/lib/xp/portal';
import { BaseMedia, Content } from '/lib/xp/content';
import { RepoNode } from '/lib/xp/node';
import { GlobalNumberValueSetData } from './global-value-set';
import { EmptyObject } from '../util-types';
import { GlobalCaseTimeSetData } from './global-case-time-set';
import {
    SearchConfigData,
    SearchConfigDescriptor,
    SearchExternalResourceData,
    SearchExternalResourceDescriptor,
} from './search-config';

// Override types for content-types with a custom editor
declare global {
    namespace XP {
        interface ContentTypes {
            'no.nav.navno:global-case-time-set': GlobalCaseTimeSetData;
            'no.nav.navno:global-value-set': GlobalNumberValueSetData;
        }
    }
}

export type ContentDataMapper<Type extends ContentDescriptor> = Type extends CustomContentDescriptor
    ? {
          type: Type;
          data: XP.ContentTypes[Type];
          page: Component<'page'> | EmptyObject;
      }
    : Type extends 'portal:fragment'
      ? {
            type: Type;
            fragment: Component<'part' | 'layout'>;
            data: undefined;
        }
      : Type extends 'portal:page-template'
        ? {
              type: Type;
              data: { supports?: CustomContentDescriptor | CustomContentDescriptor[] };
              page: Component<'page'> | EmptyObject;
          }
        : Type extends 'portal:site' | 'base:folder'
          ? {
                type: Type;
                data: undefined;
            }
          : Type extends SearchConfigDescriptor
            ? { type: Type; data: SearchConfigData }
            : Type extends SearchExternalResourceDescriptor
              ? { type: Type; data: SearchExternalResourceData }
              : Type extends MediaDescriptor
                ? {
                      type: Type;
                      data: BaseMedia;
                  }
                : { type: Type; data: unknown };

export type BuiltinContentDescriptor =
    | 'portal:fragment'
    | 'portal:template-folder'
    | 'portal:page-template'
    | 'portal:site'
    | 'base:folder'
    | 'no.nav.navno:url';

export type MediaDescriptor =
    | 'media:archive'
    | 'media:audio'
    | 'media:code'
    | 'media:data'
    | 'media:document'
    | 'media:executable'
    | 'media:image'
    | 'media:presentation'
    | 'media:spreadsheet'
    | 'media:text'
    | 'media:unknown'
    | 'media:vector'
    | 'media:video';

export type CustomContentDescriptor = keyof XP.ContentTypes;

export type ContentDescriptor =
    | MediaDescriptor
    | CustomContentDescriptor
    | BuiltinContentDescriptor
    | SearchConfigDescriptor
    | SearchExternalResourceDescriptor;

export type ContentNode<ContentType extends ContentDescriptor = ContentDescriptor> = RepoNode<
    Content<ContentType>
>;
