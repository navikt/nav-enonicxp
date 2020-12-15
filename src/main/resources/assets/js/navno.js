var navno = navno || {};
navno.buttonBottomOffset = null;
navno.topLinkButtonPlaceholder = null;
navno.topLinkStickyElement = null;
navno.requiredScrollDistanceForSticky = null;
navno.onScrollAndResize = function () {
    var viewPortBottom = $(document).scrollTop() + $(window).height();
    var isBelowPageHeader = $(document).scrollTop() > navno.requiredScrollDistanceForSticky;

    if (
        isBelowPageHeader &&
        navno.buttonBottomOffset > viewPortBottom &&
        !navno.topLinkStickyElement.hasClass('sticky-top-link')
    ) {
        navno.topLinkStickyElement.addClass('sticky-top-link');
    } else if (
        isBelowPageHeader &&
        navno.buttonBottomOffset < viewPortBottom &&
        navno.topLinkStickyElement.hasClass('sticky-top-link')
    ) {
        navno.topLinkStickyElement.removeClass('sticky-top-link');
    } else if (!isBelowPageHeader && navno.topLinkStickyElement.hasClass('sticky-top-link')) {
        navno.topLinkStickyElement.removeClass('sticky-top-link');
    }
};
navno.updatedScrollToTopLink = function () {
    navno.buttonBottomOffset =
        navno.topLinkButtonPlaceholder.offset().top + navno.topLinkButtonPlaceholder.height();
    navno.onScrollAndResize();
};
navno.scrollToTopHandler = function () {
    var $placeHolder = $('#maincontent .placeholder');
    if ($placeHolder.length === 0) {
        return false;
    }
    navno.topLinkButtonPlaceholder = $placeHolder;
    navno.topLinkStickyElement = $('#top-scroll-link').parent();
    navno.requiredScrollDistanceForSticky = $('#decorator-header').height() + 500;
    var footerMenuTop = $('#decorator-footer').offset().top;
    if ($(window).height() * 2 + 200 < footerMenuTop) {
        navno.topLinkButtonPlaceholder.removeClass('hide');
        navno.topLinkStickyElement.removeClass('hide-on-pageload');
        // Keep document height by preserving the height of where the sticky element resides, so that coordinates of elements doesn't get skewed when button is taken out by "position: fixed",
        $placeHolder.css('height', navno.topLinkButtonPlaceholder.height());
        navno.buttonBottomOffset =
            navno.topLinkButtonPlaceholder.offset().top + navno.topLinkButtonPlaceholder.height();
        if (
            $(document).scrollTop() > navno.requiredScrollDistanceForSticky &&
            $(document).scrollTop() + $(window).height() < footerMenuTop
        ) {
            navno.topLinkStickyElement.addClass('sticky-top-link');
        }
        $(document).on('scroll', navno.onScrollAndResize);
        // REFACTOR: global namespace a "isTouch" variable
        if (!('ontouchstart' in document.documentElement)) {
            $(window).on('resize', function onResize() {
                var thisWindow = $(window);
                thisWindow.off('resize');
                navno.buttonBottomOffset =
                    navno.topLinkButtonPlaceholder.offset().top +
                    navno.topLinkButtonPlaceholder.height();
                navno.onScrollAndResize();
                setTimeout(function () {
                    navno.buttonBottomOffset =
                        navno.topLinkButtonPlaceholder.offset().top +
                        navno.topLinkButtonPlaceholder.height();
                    navno.onScrollAndResize();
                    thisWindow.on('resize', onResize);
                }, 2000);
            });
        }
        if ('ontouchstart' in document.documentElement) {
            var onOrientationChange = function (e) {
                e.stopPropagation();
                setTimeout(function () {
                    navno.buttonBottomOffset =
                        navno.topLinkButtonPlaceholder.offset().top +
                        navno.topLinkButtonPlaceholder.height();
                    navno.onScrollAndResize();
                }, 500);
            };
            $(window).on('resize', onOrientationChange); // using resize instead of orientationchange for compatibility
            // touchmove mostly for iOS which doesn't support scroll events while holding touch down on screen (only when finger is released does scroll event fire)
            $(document).on('touchmove', navno.onScrollAndResize);
        }
    }
};
$(function () {
    $('#top-scroll-link').on('click', function (e) {
        e.preventDefault();
        var t = $('#page-top');
        $('html, body').animate(
            {
                scrollTop: t.offset().top,
            },
            {
                duration: 250,
            }
        );
        t.attr('tabindex', '-1').focus();
    });
});
$(function () {
    $('nav.table-of-contents li a').click(function (e) {
        var t = $(this);
        e.preventDefault();
        navno.scrollToId(t);
    });
});
navno.scrollToId = function (e) {
    var t = e.attr('href');
    var n = t.substring(t.lastIndexOf('#'));
    $('html, body').animate(
        {
            scrollTop: $(n).offset().top - 25,
        },
        {
            duration: 250,
            complete: function () {
                var e = $('nav.table-of-contents');
                var t = e.attr('data-selected-id');
                t !== '' && $(t).removeClass('selected'),
                    e.attr('data-selected-id', n),
                    window.setTimeout(function () {
                        $(n)[0].focus(),
                            history && history.pushState
                                ? history.pushState(null, null, n)
                                : (window.location.href = n);
                    }, 0),
                    setTimeout(function () {
                        $(n).addClass('selected');
                    }, 800);
            },
        }
    );
};
navno.beforeContentPrint = function () {
    var e = $('#print-url').text();
    var t = !1;
    $.ajax({
        type: 'GET',
        url: e,
        success: function (e) {
            t = !0;
            var n = $.parseHTML(e);
            var i = $('#pagecontent');
            var o = i.find('section');
            var a = $(n).find('section');
            var r = navno.getSelectedChapterIndex();
            if (r === 0) {
                o.addClass('hide'),
                    $(a).each(function () {
                        i.append(a);
                    });
            } else {
                var s = i.parent();
                var i = $(n).find('article');
                $('#pagecontent').addClass('hide'), s.append(i);
            }
        },
        complete: function () {
            t == 1 &&
                setTimeout(function () {
                    t = !1;
                    window.print();
                }, 200);
        },
    });
};
navno.afterContentPrint = function () {
    if ($('#print-all').hasClass('selected')) {
        $('#print-all').removeClass('selected');
        var e = navno.getSelectedChapterIndex();
        if (e === 0) {
            var t = $('#pagecontent');
            var n = t.find('section');
            n.each(function (e) {
                var t = $(this);
                e > 0 ? t.remove() : t.removeClass('hide');
            }),
                t.find('header').removeClass('hide');
            t.find('.article-body').removeClass('hide');
        } else {
            $('article').last().remove();
            $('article.hide').removeClass('hide');
        }
    } else {
        $('#print-page').hasClass('selected') && $('#print-page').removeClass('selected');
    }
};
navno.getSelectedChapterIndex = function () {
    var e = $('.content-submenu');
    var t = e.find('a.selected');
    var n = -1;
    if (t.length > 0) {
        var i = t.parent();
        n = e.find('li').index(i);
    }
    return n;
};
navno.initContentPrintHandler = function () {
    if ($('.toolbar').length > 0) {
        var e = $('#print-page');
        e.length > 0 &&
            (e.on('click', function () {
                $(this).addClass('selected'), window.print();
            }),
            e[0].addEventListener('keypress', function (e) {
                var t = e.which || e.keyCode;
                t === 13 && window.print();
            })),
            $('#print-all').length > 0 &&
                ($('#print-all').on('click', function () {
                    $(this).addClass('selected'), navno.beforeContentPrint();
                }),
                $('#print-all')[0].addEventListener('keypress', function (e) {
                    var t = e.which || e.keyCode;
                    t === 13 && ($(this).addClass('selected'), navno.beforeContentPrint());
                }));
    }
};
$(function () {
    var e = !1;
    var t = function () {
        setTimeout(function () {
            navno.afterContentPrint();
        }, 400);
    };
    if (((window.onafterprint = t), window.matchMedia)) {
        var n = window.matchMedia('print');
        n.addListener(function (t) {
            e == 0 &&
                (t.matches ||
                    ((e = !0),
                    setTimeout(function () {
                        (e = !1), navno.afterContentPrint();
                    }, 400)));
        });
    }
});
navno.onClickEnterContentLanguage = function (e) {
    var t = function (t) {
        var n = $('.content-languages');
        if (typeof t !== 'undefined') {
            t.stopPropagation();
            var i = $('header.siteheader ul.dropdown-menu');
            i.hasClass('hidden') || i.addClass('hidden');
        }
        n.hasClass('selected')
            ? (e.addClass('hide'), n.removeClass('selected'))
            : (n.addClass('selected'), e.removeClass('hide'));
    };
    return t;
};
navno.contentLanguages = function () {
    var e = $('.content-languages');
    if (e.length > 0) {
        var t = e.find('ul');
        e.on('click', navno.onClickEnterContentLanguage(t, e)),
            e.on('keyup', function (n) {
                var i = n.which || n.keyCode;
                i === 13 &&
                    (e.hasClass('selected')
                        ? (t.addClass('hide'), e.removeClass('selected'))
                        : (e.addClass('selected'), t.removeClass('hide')));
            });
    }
};
$.fn.navnoAccordion = function () {
    var e;
    var t;
    var n = 0;
    return (
        (e = function (e) {
            (e = $(e)),
                e.attr('id') || e.attr('id', 'accordion-' + new Date().getTime() + '-' + ++n);
        }),
        (t = function (e) {
            var t = $(e.target);
            var n = t.closest('.accordion-item');
            var i = n.find('ul').height() + 30;
            n
                .siblings()
                .removeClass('expanded js-animated')
                .find('.accordion-panel')
                .css('height', '')
                .parent()
                .find('[aria-expanded]')
                .attr('aria-expanded', 'false'),
                n.siblings().find('[aria-hidden]').attr('aria-hidden', 'true'),
                n.hasClass('expanded')
                    ? (n
                          .removeClass('expanded')
                          .find('.accordion-panel')
                          .css('height', '')
                          .parent()
                          .find('[aria-expanded]')
                          .attr('aria-expanded', 'false'),
                      n.find('[aria-hidden]').attr('aria-hidden', 'true'),
                      setTimeout(function () {
                          n.removeClass('js-animated');
                      }, 200))
                    : (n
                          .addClass('expanded js-animated')
                          .find('.accordion-panel')
                          .css('height', i)
                          .parent()
                          .find('[aria-expanded]')
                          .attr('aria-expanded', 'true'),
                      n.find('[aria-hidden]').attr('aria-hidden', 'false'));
        }),
        this.each(function () {
            var n = $(this);
            var i = n.children();
            i.each(function (t, n) {
                var i = $(n);
                var o = i.find('.accordion-panel');
                var a = i.find('.accordion-toggle');
                e(o),
                    e(a),
                    a.attr({
                        'aria-haspopup': 'true',
                        'aria-owns': o.attr('id'),
                        'aria-controls': o.attr('id'),
                        'aria-expanded': 'false',
                    }),
                    o
                        .attr({
                            role: 'group',
                            'aria-hidden': 'true',
                        })
                        .not('[aria-labelledby]')
                        .attr('aria-labelledby', a.attr('id'));
            }),
                $('.accordion-toggle').on('click', function (e) {
                    e.preventDefault(), t(e);
                });
        })
    );
};
function logAmplitudeEvent(event, data) {
    return new Promise(function (resolve) {
        const eventData = data || {};
        eventData.app = 'navno';
        eventData.url = window.location.origin + window.location.pathname;
        eventData.hostname = window.location.hostname;
        eventData.pagePath = window.location.pathname;
        eventData.sidetittel = document.title;
        amplitude.getInstance().logEvent(event, eventData, resolve);
    });
}
function getHeading(element) {
    let text = '';
    const $el = $(element);
    if ($el.attr('data-ga') === 'link-panel' || $el.attr('data-ga') === 'link-list') {
        text = $el.closest('.ga-container').children('h2').text();
    }
    //Fjern eventuelle gjenværende html-tags og whitespace
    return text.replace(/(<([^>]+)>)/gi, '').trim();
}
function getLinkText(element) {
    let text = '';
    if (element.classList.contains('hero-link')) {
        text = element.querySelector('.leading-icon').innerHTML;
    } else if (element.classList.contains('lenkepanel')) {
        text = element.querySelector('.lenkepanel__heading').innerHTML;
    } else {
        text = element.innerHTML;
    }
    //Fjern eventuelle gjenværende html-tags og whitespace
    return text.replace(/(<([^>]+)>)/gi, '').trim();
}
$(document).ready(function () {
    const $accordion = $('#related-content-accordion');
    if ($accordion.length) {
        $accordion.navnoAccordion();
        $accordion.find('[data-expand="true"] .accordion-toggle').click();
    }
    navno.initContentPrintHandler();
    navno.contentLanguages();
    navno.scrollToTopHandler();

    amplitude.getInstance().init('default', '', {
        apiEndpoint: 'amplitude.nav.no/collect-auto',
        saveEvents: false,
        includeUtm: true,
        includeReferrer: true,
        platform: window.location.toString(),
    });
    document.querySelectorAll('[data-ga]').forEach(function (el) {
        el.onclick = function () {
            const eventData = {
                komponent: this.getAttribute('data-ga'),
                lenkegruppe: getHeading(this),
                lenketekst: getLinkText(this),
                destinasjon: this.getAttribute('href'),
            };
            logAmplitudeEvent('navigere', eventData);
        };
    });
});
