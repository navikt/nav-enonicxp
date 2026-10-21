import { rewriteLoopbackUrls } from '@navno-app/lib/guillotine/utils/loopback-urls';

const ID = '991bd887-052b-4033-830e-9059e16de0ae:9ae06cd491235015fa8a5bd4a8b819c5';

describe('rewriteLoopbackUrls', () => {
    test('rewrites site URLs to public paths', () => {
        expect(rewriteLoopbackUrls('"/_guillotine/default/master/www.nav.no/person/side"')).toBe(
            '"/person/side"'
        );
    });

    test('rewrites master image URLs from any project to the XP7 image format', () => {
        const json = JSON.stringify({
            default: `/_guillotine/default/master/_/media:image/default/${ID}/width-100/bilde.png`,
            layer: `/_guillotine/navno-nynorsk/master/_/media:image/navno-nynorsk/${ID}/block-100-50/bilde%20to.png`,
        });

        expect(JSON.parse(rewriteLoopbackUrls(json))).toEqual({
            default: `/_/image/${ID}/width-100/bilde.png`,
            layer: `/_/image/${ID}/block-100-50/bilde%20to.png`,
        });
    });

    test('rewrites master attachment URLs to inline or download in the XP7 format', () => {
        const json = JSON.stringify({
            inline: `/_guillotine/navno-nynorsk/master/_/media:attachment/navno-nynorsk/${ID}/fil.pdf`,
            download: `/_guillotine/navno-engelsk/master/_/media:attachment/navno-engelsk/${ID}/fil.pdf?download`,
            downloadWithParams: `/_/media:attachment/default/${ID}/fil.pdf?download&foo=bar`,
            downloadLastParam: `/_/media:attachment/default/${ID}/fil.pdf?foo=bar&download`,
            otherParams: `/_/media:attachment/default/${ID}/fil.pdf?foo=bar`,
        });

        expect(JSON.parse(rewriteLoopbackUrls(json))).toEqual({
            inline: `/_/attachment/inline/${ID}/fil.pdf`,
            download: `/_/attachment/download/${ID}/fil.pdf`,
            downloadWithParams: `/_/attachment/download/${ID}/fil.pdf?foo=bar`,
            downloadLastParam: `/_/attachment/download/${ID}/fil.pdf?foo=bar`,
            otherParams: `/_/attachment/inline/${ID}/fil.pdf?foo=bar`,
        });
    });

    test('stops at single-quoted and unquoted HTML attribute boundaries', () => {
        const html = `<a href='/_/media:attachment/default/${ID}/fil.pdf?download'>Fil</a><img src=/_/media:image/default/${ID}/width-100/bilde.png>`;

        expect(rewriteLoopbackUrls(html)).toBe(
            `<a href='/_/attachment/download/${ID}/fil.pdf'>Fil</a><img src=/_/image/${ID}/width-100/bilde.png>`
        );
    });

    test('keeps HTML-escaped query param separators', () => {
        const html = `<a href="/_/media:attachment/default/${ID}/fil.pdf?foo=bar&amp;download&amp;baz=1">Fil</a>`;

        expect(rewriteLoopbackUrls(html)).toBe(
            `<a href="/_/attachment/download/${ID}/fil.pdf?foo=bar&amp;baz=1">Fil</a>`
        );
    });

    test('rewrites media URLs in HTML attributes', () => {
        const html = `<a href="/_/media:attachment/navno-nynorsk/${ID}/fil.pdf?download">Last ned</a><img src="/_/media:image/default/${ID}/width-768/bilde.png" />`;

        expect(rewriteLoopbackUrls(html)).toBe(
            `<a href="/_/attachment/download/${ID}/fil.pdf">Last ned</a><img src="/_/image/${ID}/width-768/bilde.png" />`
        );
    });

    test('rewrites draft media URLs, which include the branch in the project segment', () => {
        const json = JSON.stringify({
            image: `/_guillotine/default/draft/_/media:image/default:draft/${ID}/width-100/bilde.png`,
            attachment: `/_guillotine/navno-nynorsk/draft/_/media:attachment/navno-nynorsk:draft/${ID}/fil.pdf?download`,
        });

        expect(JSON.parse(rewriteLoopbackUrls(json))).toEqual({
            image: `/_/image/${ID}/width-100/bilde.png`,
            attachment: `/_/attachment/download/${ID}/fil.pdf`,
        });
    });
});
