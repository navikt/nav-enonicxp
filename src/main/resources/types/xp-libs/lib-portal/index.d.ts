// We override certain types from this library in order to enable type narrowing of content-type specific fields

import { ComponentName, ComponentType } from '../../components/component-config';
import { PortalComponent } from '../../components/component-portal';
import { Content } from '/lib/xp/content';

export { Content } from '/lib/xp/content';

export type Component<
    Type extends ComponentType = ComponentType,
    Name extends ComponentName = ComponentName,
> = PortalComponent<Type, Name>;

/**
 * This function returns the content corresponding to the current execution context. It is meant to be called from a page, layout or
 * part controller
 *
 * @example-ref examples/portal/getContent.js
 *
 * @returns {object|null} The current content as JSON.
 */
export declare function getContent(): Content | null;

/**
 * This function returns the component corresponding to the current execution context. It is meant to be called
 * from a layout or part controller.
 *
 * @example-ref examples/portal/getComponent.js
 *
 * @returns {object|null} The current component as JSON.
 */
export declare function getComponent<
    Type extends ComponentType = ComponentType,
    Name extends ComponentName = ComponentName,
>(): PortalComponent<Type, Name> | null;

export interface Region {
    components: Array<Component>;
    name: string;
}
// There no "rest" type operator for imports/exports, so we have to export everything we don't
// override one by one :|
export {
    AssetUrlParams,
    url,
    AttachmentUrlParams,
    XOR,
    Without,
    UrlParams,
    SiteConfig,
    ServiceUrlParams,
    Site,
    serviceUrl,
    sanitizeHtml,
    ProcessHtmlParams,
    processHtml,
    PageUrlParams,
    pageUrl,
    MultipartItem,
    MultipartForm,
    LogoutUrlParams,
    logoutUrl,
    LoginUrlParams,
    loginUrl,
    ImageUrlParams,
    imageUrl,
    ImagePlaceholderParams,
    imagePlaceholder,
    IdXorPath,
    IdProviderUrlParams,
    idProviderUrl,
    getSiteConfig,
    getSite,
    getMultipartText,
    getMultipartStream,
    getMultipartItem,
    getMultipartForm,
    getIdProviderKey,
    ComponentUrlParams,
    componentUrl,
    ByteSource,
    attachmentUrl,
    Attachment,
    assetUrl,
} from '@enonic-types/lib-portal';
