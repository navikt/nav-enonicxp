/**
 * @preserve FastClick: polyfill to remove click delays on browsers with touch UIs.
 *
 * @version 1.0.0
 * @codingstandard ftlabs-jsv2
 * @copyright The Financial Times Limited [All Rights Reserved]
 * @license MIT License (see LICENSE.txt)
 */

/*jslint browser:true, node:true*/
/*global define, Event, Node*/

// TODO polyfill loading

function FastClick(b, a) {
	var c;
	a = a || {
	};
	this.trackingClick = false;
	this.trackingClickStart = 0;
	this.targetElement = null;
	this.touchStartX = 0;
	this.touchStartY = 0;
	this.lastTouchIdentifier = 0;
	this.touchBoundary = a.touchBoundary || 10;
	this.layer = b;
	this.tapDelay = a.tapDelay || 200;
	if (FastClick.notNeeded(b)) {
		return
	}
	function d(f, e) {
		return function () {
			return f.apply(e, arguments)
		}
	}

	if (deviceIsAndroid) {
		b.addEventListener("mouseover", d(this.onMouse, this), true);
		b.addEventListener("mousedown", d(this.onMouse, this), true);
		b.addEventListener("mouseup", d(this.onMouse, this), true)
	}
	b.addEventListener("click", d(this.onClick, this), true);
	b.addEventListener("touchstart", d(this.onTouchStart, this), false);
	b.addEventListener("touchmove", d(this.onTouchMove, this), false);
	b.addEventListener("touchend", d(this.onTouchEnd, this), false);
	b.addEventListener("touchcancel", d(this.onTouchCancel, this), false);
	if (!Event.prototype.stopImmediatePropagation) {
		b.removeEventListener = function (f, h, e) {
			var g = Node.prototype.removeEventListener;
			if (f === "click") {
				g.call(b, f, h.hijacked || h, e)
			} else {
				g.call(b, f, h, e)
			}
		};
		b.addEventListener = function (g, h, f) {
			var e = Node.prototype.addEventListener;
			if (g === "click") {
				e.call(b, g, h.hijacked || (h.hijacked = function (i) {
					if (!i.propagationStopped) {
						h(i)
					}
				}), f)
			} else {
				e.call(b, g, h, f)
			}
		}
	}
	if (typeof b.onclick === "function") {
		c = b.onclick;
		b.addEventListener("click", function (e) {
				c(e)
			},
			false);
		b.onclick = null
	}
}
var deviceIsAndroid = navigator.userAgent.indexOf("Android") > 0;
var deviceIsIOS = /iP(ad|hone|od)/.test(navigator.userAgent);
var deviceIsIOS4 = deviceIsIOS && (/OS 4_\d(_\d)?/).test(navigator.userAgent);
var deviceIsIOSWithBadTarget = deviceIsIOS && (/OS ([6-9]|\d{2})_\d/).test(navigator.userAgent);
FastClick.prototype.needsClick = function (a) {
	switch (a.nodeName.toLowerCase()) {
		case "button":
		case "select":
		case "textarea":
			if (a.disabled) {
				return true
			}
			break;
		case "input":
			if ((deviceIsIOS && a.type === "file") || a.disabled) {
				return true
			}
			break;
		case "label":
		case "video":
			return true
	}
	return (/\bneedsclick\b/).test(a.className)
};
FastClick.prototype.needsFocus = function (a) {
	switch (a.nodeName.toLowerCase()) {
		case "textarea":
			return true;
		case "select":
			return !deviceIsAndroid;
		case "input":
			switch (a.type) {
				case "button":
				case "checkbox":
				case "file":
				case "image":
				case "radio":
				case "submit":
					return false
			}
			return !a.disabled && !a.readOnly;
		default:
			return (/\bneedsfocus\b/).test(a.className)
	}
};
FastClick.prototype.sendClick = function (b, c) {
	var a, d;
	if (document.activeElement && document.activeElement !== b) {
		document.activeElement.blur()
	}
	d = c.changedTouches[0];
	a = document.createEvent("MouseEvents");
	a.initMouseEvent(this.determineEventType(b), true, true, window, 1, d.screenX, d.screenY, d.clientX, d.clientY, false, false, false, false, 0, null);
	a.forwardedTouchEvent = true;
	b.dispatchEvent(a)
};
FastClick.prototype.determineEventType = function (a) {
	if (deviceIsAndroid && a.tagName.toLowerCase() === "select") {
		return "mousedown"
	}
	return "click"
};
FastClick.prototype.focus = function (a) {
	var b;
	if (deviceIsIOS && a.setSelectionRange && a.type.indexOf("date") !== 0 && a.type !== "time") {
		b = a.value.length;
		a.setSelectionRange(b, b)
	} else {
		a.focus()
	}
};
FastClick.prototype.updateScrollParent = function (b) {
	var c, a;
	c = b.fastClickScrollParent;
	if (!c || !c.contains(b)) {
		a = b;
		do {
			if (a.scrollHeight > a.offsetHeight) {
				c = a;
				b.fastClickScrollParent = a;
				break
			}
			a = a.parentElement
		}
		while (a)
	}
	if (c) {
		c.fastClickLastScrollTop = c.scrollTop
	}
};
FastClick.prototype.getTargetElementFromEventTarget = function (a) {
	if (a.nodeType === Node.TEXT_NODE) {
		return a.parentNode
	}
	return a
};
FastClick.prototype.onTouchStart = function (c) {
	var a, d, b;
	if (c.targetTouches.length > 1) {
		return true
	}
	a = this.getTargetElementFromEventTarget(c.target);
	d = c.targetTouches[0];
	if (deviceIsIOS) {
		b = window.getSelection();
		if (b.rangeCount && !b.isCollapsed) {
			return true
		}
		if (!deviceIsIOS4) {
			if (d.identifier === this.lastTouchIdentifier) {
				c.preventDefault();
				return false
			}
			this.lastTouchIdentifier = d.identifier;
			this.updateScrollParent(a)
		}
	}
	this.trackingClick = true;
	this.trackingClickStart = c.timeStamp;
	this.targetElement = a;
	this.touchStartX = d.pageX;
	this.touchStartY = d.pageY;
	if ((c.timeStamp - this.lastClickTime) < this.tapDelay) {
		c.preventDefault()
	}
	return true
};
FastClick.prototype.touchHasMoved = function (a) {
	var c = a.changedTouches[0], b = this.touchBoundary;
	if (Math.abs(c.pageX - this.touchStartX) > b || Math.abs(c.pageY - this.touchStartY) > b) {
		return true
	}
	return false
};
FastClick.prototype.onTouchMove = function (a) {
	if (!this.trackingClick) {
		return true
	}
	if (this.targetElement !== this.getTargetElementFromEventTarget(a.target) || this.touchHasMoved(a)) {
		this.trackingClick = false;
		this.targetElement = null
	}
	return true
};
FastClick.prototype.findControl = function (a) {
	if (a.control !== undefined) {
		return a.control
	}
	if (a.htmlFor) {
		return document.getElementById(a.htmlFor)
	}
	return a.querySelector("button, input:not([type=hidden]), keygen, meter, output, progress, select, textarea")
};
FastClick.prototype.onTouchEnd = function (c) {
	var e, d, b, g, f, a = this.targetElement;
	if (!this.trackingClick) {
		return true
	}
	if ((c.timeStamp - this.lastClickTime) < this.tapDelay) {
		this.cancelNextClick = true;
		return true
	}
	this.cancelNextClick = false;
	this.lastClickTime = c.timeStamp;
	d = this.trackingClickStart;
	this.trackingClick = false;
	this.trackingClickStart = 0;
	if (deviceIsIOSWithBadTarget) {
		f = c.changedTouches[0];
		a = document.elementFromPoint(f.pageX - window.pageXOffset, f.pageY - window.pageYOffset) || a;
		a.fastClickScrollParent = this.targetElement.fastClickScrollParent
	}
	b = a.tagName.toLowerCase();
	if (b === "label") {
		e = this.findControl(a);
		if (e) {
			this.focus(a);
			if (deviceIsAndroid) {
				return false
			}
			a = e
		}
	} else {
		if (this.needsFocus(a)) {
			if ((c.timeStamp - d) > 100 || (deviceIsIOS && window.top !== window && b === "input")) {
				this.targetElement = null;
				return false
			}
			this.focus(a);
			this.sendClick(a, c);
			if (!deviceIsIOS4 || b !== "select") {
				this.targetElement = null;
				c.preventDefault()
			}
			return false
		}
	}
	if (deviceIsIOS && !deviceIsIOS4) {
		g = a.fastClickScrollParent;
		if (g && g.fastClickLastScrollTop !== g.scrollTop) {
			return true
		}
	}
	if (!this.needsClick(a)) {
		c.preventDefault();
		this.sendClick(a, c)
	}
	return false
};
FastClick.prototype.onTouchCancel = function () {
	this.trackingClick = false;
	this.targetElement = null
};
FastClick.prototype.onMouse = function (a) {
	if (!this.targetElement) {
		return true
	}
	if (a.forwardedTouchEvent) {
		return true
	}
	if (!a.cancelable) {
		return true
	}
	if (!this.needsClick(this.targetElement) || this.cancelNextClick) {
		if (a.stopImmediatePropagation) {
			a.stopImmediatePropagation()
		} else {
			a.propagationStopped = true
		}
		a.stopPropagation();
		a.preventDefault();
		return false
	}
	return true
};
FastClick.prototype.onClick = function (a) {
	var b;
	if (this.trackingClick) {
		this.targetElement = null;
		this.trackingClick = false;
		return true
	}
	if (a.target.type === "submit" && a.detail === 0) {
		return true
	}
	b = this.onMouse(a);
	if (!b) {
		this.targetElement = null
	}
	return b
};
FastClick.prototype.destroy = function () {
	var a = this.layer;
	if (deviceIsAndroid) {
		a.removeEventListener("mouseover", this.onMouse, true);
		a.removeEventListener("mousedown", this.onMouse, true);
		a.removeEventListener("mouseup", this.onMouse, true)
	}
	a.removeEventListener("click", this.onClick, true);
	a.removeEventListener("touchstart", this.onTouchStart, false);
	a.removeEventListener("touchmove", this.onTouchMove, false);
	a.removeEventListener("touchend", this.onTouchEnd, false);
	a.removeEventListener("touchcancel", this.onTouchCancel, false)
};
FastClick.notNeeded = function (b) {
	var a;
	var c;
	if (typeof window.ontouchstart === "undefined") {
		return true
	}
	c = +(/Chrome\/([0-9]+)/.exec(navigator.userAgent) || [, 0])[1];
	if (c) {
		if (deviceIsAndroid) {
			a = document.querySelector("meta[name=viewport]");
			if (a) {
				if (a.content.indexOf("user-scalable=no") !== -1) {
					return true
				}
				if (c > 31 && window.innerWidth <= window.screen.width) {
					return true
				}
			}
		} else {
			return true
		}
	}
	if (b.style.msTouchAction === "none") {
		return true
	}
	return false
};
FastClick.attach = function (b, a) {
	return new FastClick(b, a)
};

if (typeof define !== "undefined" && define.amd) {
	define(function () {
		return FastClick
	})
} else {
	if (typeof module !== "undefined" && module.exports) {
		module.exports = FastClick.attach;
		module.exports.FastClick = FastClick
	} else {
		window.FastClick = FastClick
	}
}



var navno = navno || {
};

/*
 * Driftsmelding sjekk
 */

$(function () {
    var notificationEl = $("#driftsmelding"),
	    url = notificationEl.data("url"),
	    html = null,
	    hasNotification = false; // Har driftsmelding

	if (url) {

		var jqxhr = $.ajax({
			type    : "GET",
			url     : url.concat('/Melding?reset=').concat(Math.ceil((Math.random() * 5120)) + (Math.random() * 1024) + 10),
			success : function (data) {
				html = $.parseHTML(data);
				hasNotification = ($(html).find('#services-ok').length === 0);
			},
			complete: function () {
				if (hasNotification) {

					notificationEl.removeAttr('data-url').find('span').remove();
					notificationEl.append($(html).find("section")).slideDown(800);
				}
				else {
					$(".service-notification").remove();
				}
			}
		});
	}
});

//////////////////////// END ////////////////////////

/*
 * On global language selector click
 */

$(function () {
	$('.site-coltrols-toolbar ul li.dropdown').click(function (e) {

		var dropdownList = $(this).find("ul.dropdown-menu");
		dropdownList.hasClass("hidden") ? dropdownList.removeClass("hidden") : dropdownList.addClass("hidden");
	});
});
//////////////////////// END ////////////////////////


/*
 * When dropdown lists are open and user clicks outside it.
 * This may be one of several different lists. Collect them here
 */

navno.handleDocClickTouch = function (e) {

	var contentLanguages = $('.content-languages');
	var siteLanguages = $('.site-coltrols-toolbar ul li.dropdown');
	var mobileSubmenu = $(".mobile-linklist-related");
	var accordion = $("aside.related-content.accordion");

	if (contentLanguages.length > 0 && contentLanguages.has(e.target).length === 0 && contentLanguages.hasClass("selected")) {
		contentLanguages.find('ul').addClass('hide');
		contentLanguages.removeClass('selected');
	}
	if (siteLanguages.has(e.target).length === 0 && !siteLanguages.find("ul.dropdown-menu").hasClass("hidden")) {
		siteLanguages.find("ul.dropdown-menu").addClass("hidden");
	}
	if (mobileSubmenu.length > 0 && mobileSubmenu.has(e.target).length === 0 && mobileSubmenu.hasClass("open") && navno.touchMovedOnArticle === false) {
		mobileSubmenu.toggleClass("open");

		var navLinkList = mobileSubmenu.find("nav");
		navLinkList.css("height", 0);

		setTimeout(function () {
				if (mobileSubmenu.hasClass("open")) {
					navLinkList.prev().find("a").attr("aria-expanded", true).attr("aria-hidden", false);
					navLinkList.attr("aria-expanded", true).attr("aria-hidden", false);
				} else {
					navLinkList.prev().find("a").attr("aria-expanded", false).attr("aria-hidden", true);
					navLinkList.attr("aria-expanded", false).attr("aria-hidden", true);
				}
			},
			400);
	}
	if (accordion.length > 0) {
		var expandedPanel = accordion.find(".expanded .accordion-panel");
		if (expandedPanel.length > 0 && accordion.has(e.target).length === 0) {

			expandedPanel.height("0");
			setTimeout(function () {
				expandedPanel.attr("aria-expanded", false).attr("aria-hidden", true).removeAttr("style").parent().removeClass("expanded js-animated").find("header a").attr("aria-expanded", false).attr("aria-hidden", true);
			}, 250);
		}
	}
};

$(function () {

	var isTouch = ('ontouchstart' in document.documentElement);

	$(document).on("click touchend", function (e) {

		if (isTouch && e.type === "touchend") {
			navno[ "handleDocClickTouch"](e);
		} else {
			navno[ "handleDocClickTouch"](e);
		}
	});
});

//////////////////////// END ////////////////////////


$(function () {
	$("a[href*='//tjenester.nav.no'][class='hero-link']").on('click', function (e) {
		if (typeof ga !== 'undefined' && ga.hasOwnProperty('loaded') && ga.loaded === true) {
			e.preventDefault();
			var heroHref = $(this).attr('href');
			ga('send', 'event', 'Forsideboks', 'klikk', $(this).attr('title'), {
				'hitCallback': function () {
					window.location = heroHref;
				}
			});
		}
	});

	$("a[rel='external']").on('click', function () {
		window.open($(this).attr('href'));
		return false;
	});
});
//////////////////////// END ////////////////////////

/*
 * Hover / focus events
 */

$(function () {

	$('#text-size-accessibility').on('mouseenter focusin', function () {
		$(this).find('.hidden').removeClass('hidden');
	}).on('mouseleave focusout', function () {
		$(this).find('.text-size-tooltip').addClass('hidden');
	}).on('click', function (e) {
		e.preventDefault();
	});
});

$(function () {

	$('.siteheader .dropdown-toggle').on('focusin', function () {
		$(this).addClass('page-languages');
	}).on('focusout', function () {
		$(this).removeClass('page-languages');
	});
});
//////////////////////// END ////////////////////////

/*
 * Login / Logout
 */

function shouldShowLoginInfo() {
	return document.cookie.indexOf(Innloggingslinje.SHOULD_SHOW_LOGIN_TOOLTIP) !== -1;
}

$(function () {
	if (shouldShowLoginInfo()) {
		var $tooltip = $('.logout-tooltip');
		$lukk = $tooltip.find('.lukk');
		$lukk.removeClass('hidden');
		$tooltip.removeClass('hidden').delay(3000).fadeOut('slow', function () {
			$tooltip.addClass('hidden').show();
			$lukk.addClass('hidden');
		});
		Innloggingslinje.setCookie(Innloggingslinje.LOGIN_TOOLTIP_HAS_BEEN_SHOWN, "1", 30);
		Innloggingslinje.deleteCookie(Innloggingslinje.SHOULD_SHOW_LOGIN_TOOLTIP);
	}
});

$(function () {
	$('.logout-tooltip .lukk').on("click", function () {
		$('.logout-tooltip').addClass('hidden');
		$('.logout-tooltip .lukk').addClass('hidden');
	});
});

$(function () {
	$('#logout, #logout-mobil').on("click", function (e) {
		e.preventDefault();
		Innloggingslinje.deleteCookie(Innloggingslinje.LOGIN_TOOLTIP_HAS_BEEN_SHOWN);
		window.location = $(this).attr('href');
	});
});


$(function () {

	var $tooltip = $('.logout-tooltip');
	$('#login-details span').first().on('mouseenter focusin', function () {
		$tooltip.removeClass('hidden');
	}).on('mouseleave focusout', function () {
		$tooltip.addClass('hidden');
	});
});

$(function () {

	var $tooltip = $('.login-tooltip');
	$('#login').first().on('mouseenter focusin', function () {
		$tooltip.removeClass('hidden');
	}).on('mouseleave focusout', function () {
		$tooltip.addClass('hidden');
	});
});


//////////////////////// END ////////////////////////

/*
 * Cookie handling (parameterized, reusable)
 * param1: name/key of cookie
 * param2: value
 * param3: how many days to expiration
 * param4: boolean to determine type of cookie, where true sets session cookie and false sets persistent cookie.
 */
navno.setCookie = function (c_name, value, exdays, isSession) {

	var exdate = new Date();
	exdate.setDate(exdate.getDate() + exdays);
	var c_value;
	if (isSession) {
		c_value = escape(value) + ((exdays == null) ? "" : ";domain=.nav.no;path=/;made_write_conn=1295214458;");
	} else {
		c_value = escape(value) + ((exdays == null) ? "" : "; expires=" + exdate.toUTCString() + ";domain=.nav.no;path=/;");
	}
	document.cookie = c_name + "=" + c_value;
};

navno.getCookie = function (c_name) {

	var c_value = document.cookie;
	var c_start = c_value.indexOf(" " + c_name + "=");

	var c_start = ((c_start === -1) ? c_value.indexOf(c_name + "=") : c_start);

	if (c_start === -1) {
		c_value = null;
	} else {
		c_start = c_value.indexOf("=", c_start) + 1;
		var c_end = c_value.indexOf(";", c_start);
		if (c_end === -1) {
			c_end = c_value.length;
		}
		c_value = unescape(c_value.substring(c_start, c_end));
	}
	return c_value
};
//////////////////////// END ////////////////////////


/*
 * High contrast toggle
 */

$(function () {

	var hc = $('#high-contrast');

	var body = $('body');
	var hc_value_onload = navno[ 'getCookie']('highContrast');

	if (hc_value_onload === '1') {
		body.addClass('contrast');
	}

	var handleHighContrast = function (e) {
		e.preventDefault();

		if (!body.hasClass('contrast')) {
			navno[ 'setCookie']('highContrast', 1, 7, false);

			body.addClass('contrast');
		} else if (body.hasClass('contrast')) {
			navno[ 'setCookie']('highContrast', 0, 7, false);

			body.removeClass('contrast');
		}
	};
	hc.on("click", handleHighContrast);
});
//////////////////////// END ////////////////////////


/*
 * Google Analytics stuff
 */

$(function () {
	if (typeof ga !== 'undefined' && ga.hasOwnProperty('loaded') && ga.loaded === true) {

		$('.visuallyhidden.focusable').eq(0).one('focus.google-analytics', function () {
			ga('send', 'event', 'Tastatur', 'focus', $(this).text());
		});
		$('#high-contrast').find('button').on('click.google-analytics', function () {
			var mode = '';
			if ($('body').hasClass('contrast')) {
				mode = 'av';
			}
			else {
				mode = 'på';
			}
			ga('send', 'event', 'Høykontrast ' + mode, 'klikk', $(this).text());
		});
		/* $('#footer-content-menu').find('.letter > a').on('click.google-analytics', function () { // request må kjøres etter lenkeliste er lastet inn pga ytelse
		 ga('send', 'event', 'Innhold A-Å', 'klikk', $(this).text());
		 });*/
		$('.carousel-control').on('click.google-analytics', function () {
			ga('send', 'event', 'Karusell', 'klikk', 'Høyre/venstre');
		});
		$('.carousel-dropdown').find('.btn').on('click.google-analytics', function () {
			ga('send', 'event', 'Karusell', 'klikk', 'Se alle');
		});

		$('#play-btn').one('click.google-analytics', function () {
			var pageTitle = $('#pagecontent').find('h1').eq(0).text() || document.title;
			ga('send', 'event', 'Talesyntese', 'Play', pageTitle);
		});

		$('#text-size-accessibility').on('click.google-analytics', function() {
			ga('send', 'event', 'Header', 'klikk', 'Skriftstorrelse');
		});
	}
});


//////////////////////// END ////////////////////////

/*
 * Footer content letters scrolling/swiping (A-Å)
 */

$(function () {
	if (window.addEventListener && $("#footer-content-menu").length > 0) {
		// skip Ie8
		var timeout, leftClicker = $('.letter-scroll-left');
		var rightClicker = $('.letter-scroll-right');
		var scrollElement = $('#footer-content-menu');

		leftClicker.click(function (e) {
			e.preventDefault();
			scrollElement.animate({
					scrollLeft: '-=120'
				},
				300);
		});
		rightClicker.click(function (e) {
			e.preventDefault();
			scrollElement.animate({
					scrollLeft: '+=120'
				},
				300);
		});

		var scrollEvents = new Array('mousedown', 'touchstart');
		var stopTouchEvents = new Array('touchleave', 'touchcancel', 'touchend');

		for (var i = 0; i < 2; i++) {
			leftClicker[0].addEventListener(scrollEvents[i], function (event) {
				timeout = setInterval(function () {
						scrollElement.animate({
								scrollLeft: '-=120'
							},
							300);
					},
					300);
			});
			rightClicker[0].addEventListener(scrollEvents[i], function (event) {
				timeout = setInterval(function () {
						scrollElement.animate({
								scrollLeft: '+=120'
							},
							300);
					},
					300);
			});
		}
		for (var i = 0; i < 3; i++) {
			leftClicker[0].addEventListener(stopTouchEvents[i], function (event) {
				clearInterval(timeout);
				return false;
			});
			rightClicker[0].addEventListener(stopTouchEvents[i], function (event) {
				clearInterval(timeout);
				return false;
			});
		}

		$(leftClicker).add(rightClicker).on('mouseup mouseout mouseleave', function (event) {
			clearInterval(timeout);
			return false;
		});
	}
});
//////////////////////// END ////////////////////////


/*
 * Set condition on when to show scroll-to-top button
 */

navno.buttonBottomOffset = null;
navno.topLinkButtonPlaceholder = null;
navno.topLinkStickyElement = null;
navno.requiredScrollDistanceForSticky = null;

navno.onScrollAndResize = function (event) {

	var viewPortBottom = $(document).scrollTop() + $(window).height();
	var isBelowPageHeader = ($(document).scrollTop() > navno.requiredScrollDistanceForSticky);

	if (isBelowPageHeader && (navno.buttonBottomOffset > viewPortBottom) && !navno.topLinkStickyElement.hasClass("sticky-top-link")) {
		navno.topLinkStickyElement.addClass('sticky-top-link');
	} else if (isBelowPageHeader && (navno.buttonBottomOffset < viewPortBottom) && navno.topLinkStickyElement.hasClass("sticky-top-link")) {
		navno.topLinkStickyElement.removeClass('sticky-top-link');
	} else if (!isBelowPageHeader && navno.topLinkStickyElement.hasClass("sticky-top-link")) {
		navno.topLinkStickyElement.removeClass('sticky-top-link');
	}

};

function updatedScrollToTopLink() {
	navno.buttonBottomOffset = navno.topLinkButtonPlaceholder.offset().top + navno.topLinkButtonPlaceholder.height();
	navno['onScrollAndResize']();
}

function scrollToTopHandler() {

	navno.topLinkButtonPlaceholder = $('.placeholder');
	navno.topLinkStickyElement = $('#top-scroll-link').parent();
	navno.requiredScrollDistanceForSticky = ($("header.siteheader").height() + 500);

	var footerMenuTop = $('footer.sitefooter').offset().top; // A-Å

	FastClick.attach(document.getElementById("top-scroll-link"));

	if (($(window).height() * 2) + 200 < footerMenuTop) {
		navno.topLinkButtonPlaceholder.removeClass("hide");

		$(".placeholder").css("height", navno.topLinkButtonPlaceholder.height());
		navno.buttonBottomOffset = navno.topLinkButtonPlaceholder.offset().top + navno.topLinkButtonPlaceholder.height();

		if ($(document).scrollTop() > navno.requiredScrollDistanceForSticky && ($(document).scrollTop() + $(window).height()) < footerMenuTop) {
			navno.topLinkStickyElement.addClass('sticky-top-link');
		}
		$(document).on("scroll", navno.onScrollAndResize);

		if (!('ontouchstart' in document.documentElement)) {
			$(window).on("resize", function onResize() {
				var thisWindow = $(window);
				thisWindow.off("resize");

				navno.buttonBottomOffset = navno.topLinkButtonPlaceholder.offset().top + navno.topLinkButtonPlaceholder.height();
				navno[ 'onScrollAndResize']();

				setTimeout(function () {
						navno.buttonBottomOffset = navno.topLinkButtonPlaceholder.offset().top + navno.topLinkButtonPlaceholder.height();
						navno[ 'onScrollAndResize']();
						thisWindow.on("resize", onResize);
					},
					2000);
			});
		}

		// TODO global namespace a "isTouch" variable
		if ('ontouchstart' in document.documentElement) {

			var onOrientationChange = function (e) {
				e.stopPropagation();

				setTimeout(function () {

						navno.buttonBottomOffset = navno.topLinkButtonPlaceholder.offset().top + navno.topLinkButtonPlaceholder.height();
						navno['onScrollAndResize']();

					},
					500);
			};

			$(window).on("resize", onOrientationChange); // using resize instead of orientationchange for compatibility

			// touchmove mostly for iOS which doesn't support scroll events while holding touch down on screen (only when finger is released does scroll event fire)
			$(document).on("touchmove", navno.onScrollAndResize);
		}
	}
}

$(function () {
	if ($('.placeholder').length > 0) {
		scrollToTopHandler();
	}
});

//////////////////////// END ////////////////////////

/*
 * Scroll to top on click/touchend
 */

$(function () {

	$('#top-scroll-link').on("click", function (e) {
		e.preventDefault();
        var pageTop = $('#page-top');
		$('html, body').animate({
			scrollTop: pageTop.offset().top
		}, {
			duration: 250
		});
        pageTop.attr('tabindex', '-1').focus();
	});
});

//////////////////////// END ////////////////////////

/*
 * Error page. Set href on "Back" button
 */

$(function () {

	var errorBody = $(".error-container");
	var clickTouchHandeled = false;

	if (errorBody.length > 0) {

		if (document.referrer.length > 0) {
			errorBody.find(".btn").attr("href", document.referrer);
		}
		else {

			errorBody.find(".btn").on("click touchend", function (e) {
				e.preventDefault();

				if (clickTouchHandeled === false) {
					clickTouchHandeled = true;

					window.history.back();
				}
			});
		}
	}
});

//////////////////////// END ////////////////////////
