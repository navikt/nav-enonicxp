import { richTextCallback } from '@navno-app/lib/guillotine/schema/schema-creation-callbacks/richtext';
import {
    FieldResolver,
    GuillotineGraphQL,
} from '@navno-app/lib/guillotine/utils/creation-callback-utils';
import { xpMocks } from '../../../../../.mocks/xp-mocks';

const { libContentMock } = xpMocks;

const getProcessedHtmlResolver = (): FieldResolver =>
    richTextCallback({} as GuillotineGraphQL, 'RichText').resolvers!.RichText.processedHtml;

const contentWithoutCustomPath = libContentMock.create({
    contentType: 'no.nav.navno:dynamic-page',
    data: {},
    displayName: 'Content without custom path',
    parentPath: '/',
    name: 'content-without-custom-path',
});

const contentWithCustomPath = libContentMock.create({
    contentType: 'no.nav.navno:dynamic-page',
    data: { customPath: '/my-custom-path' },
    displayName: 'Content with custom path',
    parentPath: '/',
    name: 'content-with-custom-path',
});

const childContentWithCustomPath = libContentMock.create({
    contentType: 'no.nav.navno:dynamic-page',
    data: { customPath: '/my-other-custom-path' },
    displayName: 'Another content with custom path',
    parentPath: '/content-with-custom-path',
    name: 'content-with-another-custom-path',
});

describe('Guillotine richtext resolver', () => {
    test('Should preserve link to internal path if no custom path set', () => {
        const resolveProcessedHtml = getProcessedHtmlResolver();

        const htmlInput = `<p>Hello world! <a href="${contentWithoutCustomPath._path}">Link to content without custom path</a></p>`;

        const processedHtml = resolveProcessedHtml({
            source: {
                processedHtml: htmlInput,
                links: [
                    {
                        contentId: contentWithoutCustomPath._id,
                    },
                ],
            },
            args: {},
            localContext: {},
        });

        expect(processedHtml).toBe(htmlInput);
    });

    test('Should resolve link to custom path', () => {
        const resolveProcessedHtml = getProcessedHtmlResolver();

        const result = resolveProcessedHtml({
            source: {
                processedHtml: `<p>Hello world! <a href="${contentWithCustomPath._path}">Link to content with custom path</a></p>`,
                links: [
                    {
                        contentId: contentWithCustomPath._id,
                        linkRef: '1234',
                    },
                ],
            },
            args: {},
            localContext: {},
        });

        expect(result).toBe(
            `<p>Hello world! <a href="${contentWithCustomPath.data.customPath}">Link to content with custom path</a></p>`
        );
    });

    test('Should resolve link to custom path with anchor', () => {
        const resolveProcessedHtml = getProcessedHtmlResolver();

        const result = resolveProcessedHtml({
            source: {
                processedHtml: `<p>Hello world! <a href="${contentWithCustomPath._path}#my-anchor">Link to content with custom path with anchor</a></p>`,
                links: [
                    {
                        contentId: contentWithCustomPath._id,
                    },
                ],
            },
            args: {},
            localContext: {},
        });

        expect(result).toBe(
            `<p>Hello world! <a href="${contentWithCustomPath.data.customPath}#my-anchor">Link to content with custom path with anchor</a></p>`
        );
    });

    test('Should resolve link to custom path with parameter', () => {
        const resolveProcessedHtml = getProcessedHtmlResolver();

        const result = resolveProcessedHtml({
            source: {
                processedHtml: `<p>Hello world! <a href="${contentWithCustomPath._path}?foo=bar">Link to content with custom path with anchor</a></p>`,
                links: [
                    {
                        contentId: contentWithCustomPath._id,
                    },
                ],
            },
            args: {},
            localContext: {},
        });

        expect(result).toBe(
            `<p>Hello world! <a href="${contentWithCustomPath.data.customPath}?foo=bar">Link to content with custom path with anchor</a></p>`
        );
    });

    test('Should resolve multiple links', () => {
        const resolveProcessedHtml = getProcessedHtmlResolver();

        const result = resolveProcessedHtml({
            source: {
                processedHtml: `<p>Hello world! <a href="${contentWithCustomPath._path}">Link to parent content</a><a href="${childContentWithCustomPath._path}">Link to child content</a></p>`,
                links: [
                    {
                        contentId: contentWithCustomPath._id,
                    },
                    {
                        contentId: childContentWithCustomPath._id,
                    },
                ],
            },
            args: {},
            localContext: {},
        });

        expect(result).toBe(
            `<p>Hello world! <a href="${contentWithCustomPath.data.customPath}">Link to parent content</a><a href="${childContentWithCustomPath.data.customPath}">Link to child content</a></p>`
        );
    });

    test('Should resolve link to custom path for links with the Guillotine loopback prefix', () => {
        const resolveProcessedHtml = getProcessedHtmlResolver();

        const result = resolveProcessedHtml({
            source: {
                processedHtml: `<p><a href="/_guillotine/default/draft/www.nav.no${contentWithCustomPath._path}">Link</a></p>`,
                links: [
                    {
                        contentId: contentWithCustomPath._id,
                    },
                ],
            },
            args: {},
            localContext: {},
        });

        expect(result).toBe(`<p><a href="${contentWithCustomPath.data.customPath}">Link</a></p>`);
    });
});
