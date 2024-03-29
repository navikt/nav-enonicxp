declare module '*/lib/xp/portal' {
    import { XOR } from 'enonic-types/types';
    import { ComponentName, ComponentType } from 'types/components/component-config';
    import { PortalComponent } from 'types/components/component-portal';
    import { Content } from '*/lib/xp/content';

    // Replacements for enonic-types definitions
    namespace portalLib {
        interface PortalLibrary {
            getComponent<
                Type extends ComponentType = ComponentType,
                Name extends ComponentName = ComponentName
            >(): Component<Type, Name>;

            getContent(): Content;
        }

        type Component<
            Type extends ComponentType = ComponentType,
            Name extends ComponentName = ComponentName
        > = Readonly<PortalComponent<Type, Name>>;
    }

    // Definitions from enonic-types v0.3.12
    namespace portalLib {
        interface PortalLibrary {
            /**
             * This function returns the component corresponding to the current execution context. It is meant to be called
             * from a layout or part controller.
             */
            // getComponent<Config extends object = never>(): Component<Config>;
            /**
             * his function returns the content corresponding to the current execution context. It is meant to be called from a
             * page, layout or part controller
             */
            // getContent<
            //     Data extends object,
            //     PageConfig extends object = never
            // >(): import('/lib/xp/content').Content<Data, PageConfig>;
            /**
             * This function returns the id provider key corresponding to the current execution context.
             */
            getIdProviderKey(): string | null;
            /**
             * This function returns a JSON containing multipart items.
             */
            getMultipartForm(): Record<string, MultipartItem | ReadonlyArray<MultipartItem>>;
            /**
             * This function returns a JSON containing a named multipart item.
             */
            getMultipartItem(name: string, index?: number): MultipartItem | undefined;
            /**
             * This function returns a data-stream for a named multipart item.
             */
            getMultipartStream(
                name: string,
                index?: number
            ): import('/lib/xp/content').ByteSource | undefined;
            /**
             * This function returns the multipart item data as text.
             */
            getMultipartText(name: string, index?: number): string | undefined;
            /**
             * This function returns the parent site of the content corresponding to the current execution context. It is meant
             * to be called from a page, layout or part controller.
             */
            getSite<Config extends object>(): import('/lib/xp/content').Site<Config>;
            /**
             * This function returns the site configuration for this app in the parent site of the content corresponding to the
             * current execution context. It is meant to be called from a page, layout or part controller.
             */
            getSiteConfig<Config>(): Config;
            /**
             * This function generates a URL pointing to an ID provider.
             */
            idProviderUrl(params: IdProviderUrlParams): string;
            /**
             * This function generates a URL to an image placeholder.
             */
            imagePlaceholder(params: ImagePlaceHolderParams): string;
            /**
             * This function generates a URL pointing to a static file.
             */
            assetUrl(params: AssetUrlParams): string;
            /**
             * This function generates a URL pointing to an attachment.
             */
            attachmentUrl(params: AttachmentUrlParams): string;
            /**
             * This function generates a URL pointing to a component.
             */
            componentUrl(params: ComponentUrlParams): string;
            /**
             * This function generates a URL pointing to a service.
             */
            serviceUrl(params: ServiceUrlParams): string;
            /**
             * This function generates a URL pointing to an image.
             */
            imageUrl(params: ImageUrlParams): string;
            /**
             * This function generates a URL pointing to the login function of an ID provider.
             */
            loginUrl(params: LoginUrlParams): string;
            /**
             * This function generates a URL pointing to the logout function of the application corresponding to the current user.
             */
            logoutUrl(params: LogoutUrlParams): string;
            /**
             * This function generates a URL pointing to a page.
             */
            pageUrl(params: PageUrlParams): string;
            /**
             * This function generates a URL.
             */
            url(params: UrlParams): string;
            /**
             * This function replaces abstract internal links contained in an HTML text by generated URLs.
             *
             * When outputting processed HTML in Thymeleaf, use attribute `data-th-utext="${processedHtml}"`.
             */
            processHtml(params: ProcessHtmlParams): string;
            /**
             * This function sanitizes an HTML string by stripping all potentially unsafe tags and attributes.
             *
             * HTML sanitization can be used to protect against cross-site scripting (XSS) attacks by sanitizing any HTML code
             * submitted by a user.
             */
            sanitizeHtml(html: string): string;
        }
        type Params = {
            readonly [key: string]: string | ReadonlyArray<string> | undefined;
        };
        // interface Component<Config> {
        //     readonly path: string;
        //     readonly type: string;
        //     readonly descriptor: string;
        //     readonly config: Config;
        //     readonly regions?: Record<string, Region>;
        // }
        interface Region {
            components: Array<Component>;
            name: string;
        }
        interface ByKey {
            readonly key: string;
        }
        interface ByPath {
            readonly path: string;
        }
        interface ById {
            readonly id: string;
        }
        interface ByComponent {
            readonly component?: string;
        }
        interface IdProviderUrlParams {
            idProvider?: string;
            contextPath?: string;
            type?: 'server' | 'absolute';
            params?: Params;
        }
        interface ImagePlaceHolderParams {
            width: number;
            height: number;
        }
        interface AssetUrlParams {
            path: string;
            application?: string;
            type?: 'server' | 'absolute';
            params?: Params;
        }
        type AttachmentUrlParams = XOR<ById, ByPath> & {
            name?: string;
            label?: string;
            download?: boolean;
            params?: Params;
            type?: 'server' | 'absolute';
        };
        type ComponentUrlParams = XOR<ByComponent, XOR<ById, ByPath>> & {
            type?: 'server' | 'absolute';
            params?: Params;
        };
        type ImageScale =
            | `block(${number},${'' | ' '}${number})`
            | `height(${number})`
            | `max(${number})`
            | `square(${number})`
            | `wide(${number},${'' | ' '}${number})`
            | `width(${number})`;
        type ImageUrlParams = XOR<ById, ByPath> & {
            scale: ImageScale;
            quality?: number;
            background?: string;
            format?: string;
            filter?: string;
            type?: 'server' | 'absolute';
            params?: Params;
        };
        type PageUrlParams = XOR<ById, ByPath> & {
            type?: 'server' | 'absolute';
            params?: Params;
        };
        interface LoginUrlParams {
            idProvider?: string;
            redirect?: string;
            contextPath?: string;
            type?: 'server' | 'absolute';
            params?: Params;
        }
        interface LogoutUrlParams {
            redirect?: string;
            contextPath?: string;
            type?: 'server' | 'absolute';
            params?: Params;
        }
        interface ServiceUrlParams {
            service: string;
            application?: string;
            type?: 'server' | 'absolute';
            params?: Params;
        }
        interface UrlParams {
            path?: string;
            type?: 'server' | 'absolute';
            params?: Params;
        }
        interface ProcessHtmlParams {
            /**
             * Html value string to process.
             */
            value: string;
            /**
             * URL type. Either server (server-relative URL) or absolute.
             */
            type?: 'server' | 'absolute';
            /**
             * A comma-separated list of image widths. If this parameter is provided, all <img> tags will have an additional
             * srcset attribute with image URLs generated for specified widths.
             * @since XP 7.7.0
             */
            imageWidths?: Array<number>;
            /**
             * This string is used to set img[sizes].
             * E.g a value can be '(max-width: 960px) 600px'
             * @since XP 7.8.0
             */
            imageSizes?: string;
        }
        interface MultipartItem {
            readonly name: string;
            readonly fileName?: string;
            readonly contentType?: string;
            readonly size: number;
        }
    }

    const portalLib: portalLib.PortalLibrary;
    export = portalLib;
}
