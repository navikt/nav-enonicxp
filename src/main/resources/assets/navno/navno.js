function FastClick(e, t) {
    function n(e, t) {
        return function() {
            return e.apply(t, arguments)
        }
    }
    var i;
    t = t || {},
        this.trackingClick = !1,
        this.trackingClickStart = 0,
        this.targetElement = null,
        this.touchStartX = 0,
        this.touchStartY = 0,
        this.lastTouchIdentifier = 0,
        this.touchBoundary = t.touchBoundary || 10,
        this.layer = e,
        this.tapDelay = t.tapDelay || 200,
    FastClick.notNeeded(e) || (deviceIsAndroid && (e.addEventListener("mouseover", n(this.onMouse, this), !0),
        e.addEventListener("mousedown", n(this.onMouse, this), !0),
        e.addEventListener("mouseup", n(this.onMouse, this), !0)),
        e.addEventListener("click", n(this.onClick, this), !0),
        e.addEventListener("touchstart", n(this.onTouchStart, this), !1),
        e.addEventListener("touchmove", n(this.onTouchMove, this), !1),
        e.addEventListener("touchend", n(this.onTouchEnd, this), !1),
        e.addEventListener("touchcancel", n(this.onTouchCancel, this), !1),
    Event.prototype.stopImmediatePropagation || (e.removeEventListener = function(t, n, i) {
            var o = Node.prototype.removeEventListener;
            "click" === t ? o.call(e, t, n.hijacked || n, i) : o.call(e, t, n, i)
        }
            ,
            e.addEventListener = function(t, n, i) {
                var o = Node.prototype.addEventListener;
                "click" === t ? o.call(e, t, n.hijacked || (n.hijacked = function(e) {
                        e.propagationStopped || n(e)
                    }
                ), i) : o.call(e, t, n, i)
            }
    ),
    "function" == typeof e.onclick && (i = e.onclick,
        e.addEventListener("click", function(e) {
            i(e)
        }, !1),
        e.onclick = null))
}
function shouldShowLoginInfo() {
    return -1 !== document.cookie.indexOf(Innloggingslinje.SHOULD_SHOW_LOGIN_TOOLTIP)
}
function updatedScrollToTopLink() {
    navno.buttonBottomOffset = navno.topLinkButtonPlaceholder.offset().top + navno.topLinkButtonPlaceholder.height(),
        navno.onScrollAndResize()
}
function scrollToTopHandler() {
    navno.topLinkButtonPlaceholder = $(".placeholder"),
        navno.topLinkStickyElement = $("#top-scroll-link").parent(),
        navno.requiredScrollDistanceForSticky = $("header.siteheader").height() + 500;
    var e = $("footer.sitefooter").offset().top;
    if (FastClick.attach(document.getElementById("top-scroll-link")),
        2 * $(window).height() + 200 < e && (navno.topLinkButtonPlaceholder.removeClass("hide"),
            $(".placeholder").css("height", navno.topLinkButtonPlaceholder.height()),
            navno.buttonBottomOffset = navno.topLinkButtonPlaceholder.offset().top + navno.topLinkButtonPlaceholder.height(),
        $(document).scrollTop() > navno.requiredScrollDistanceForSticky && $(document).scrollTop() + $(window).height() < e && navno.topLinkStickyElement.addClass("sticky-top-link"),
            $(document).on("scroll", navno.onScrollAndResize),
        "ontouchstart"in document.documentElement || $(window).on("resize", function n() {
            var e = $(window);
            e.off("resize"),
                navno.buttonBottomOffset = navno.topLinkButtonPlaceholder.offset().top + navno.topLinkButtonPlaceholder.height(),
                navno.onScrollAndResize(),
                setTimeout(function() {
                    navno.buttonBottomOffset = navno.topLinkButtonPlaceholder.offset().top + navno.topLinkButtonPlaceholder.height(),
                        navno.onScrollAndResize(),
                        e.on("resize", n)
                }, 2e3)
        }),
        "ontouchstart"in document.documentElement)) {
        var t = function(e) {
            e.stopPropagation(),
                setTimeout(function() {
                    navno.buttonBottomOffset = navno.topLinkButtonPlaceholder.offset().top + navno.topLinkButtonPlaceholder.height(),
                        navno.onScrollAndResize()
                }, 500)
        };
        $(window).on("resize", t),
            $(document).on("touchmove", navno.onScrollAndResize)
    }
}
function setLockedClassOnInaccessibleMenuElements() {
    $("a[data-sec-level]").each(function() {
        this.getAttribute("data-sec-level") > navno.securityLevel && ($(this).addClass("locked"),
            $(this).attr("aria-label", "Låst: "))
    })
}
function hideDittNavMenuSetLogin() {
    $("a[data-sec-level]").first().closest("ul.subnavitems").addClass("hidden"),
        $("a[data-sec-level]").first().closest("div").find("div.tilbaketilgruppe").addClass("hidden"),
        $("a[data-sec-level]").first().closest("div").children("div.submenu-logg-inn").removeClass("hidden")
}
function setCorrectSecLevelUpgradeInfoText(e) {
    4 > e && ($(".secLevelUpgradeInfo").removeClass("hidden"),
        3 === e ? ($(".secLevel3Info").removeClass("hidden"),
            $(".secLevel3Info").removeAttr("aria-hidden")) : ($(".secLevel2Info").removeClass("hidden"),
            $(".secLevel2Info").removeAttr("aria-hidden")))
}
!function(e, t) {
    "object" == typeof module && "object" == typeof module.exports ? module.exports = e.document ? t(e, !0) : function(e) {
            if (!e.document)
                throw new Error("jQuery requires a window with a document");
            return t(e)
        }
        : t(e)
}("undefined" != typeof window ? window : this, function(e, t) {
    function n(e) {
        var t = e.length
            , n = ot.type(e);
        return "function" === n || ot.isWindow(e) ? !1 : 1 === e.nodeType && t ? !0 : "array" === n || 0 === t || "number" == typeof t && t > 0 && t - 1 in e
    }
    function i(e, t, n) {
        if (ot.isFunction(t))
            return ot.grep(e, function(e, i) {
                return !!t.call(e, i, e) !== n
            });
        if (t.nodeType)
            return ot.grep(e, function(e) {
                return e === t !== n
            });
        if ("string" == typeof t) {
            if (ft.test(t))
                return ot.filter(t, e, n);
            t = ot.filter(t, e)
        }
        return ot.grep(e, function(e) {
            return ot.inArray(e, t) >= 0 !== n
        })
    }
    function o(e, t) {
        do
            e = e[t];
        while (e && 1 !== e.nodeType);return e
    }
    function a(e) {
        var t = xt[e] = {};
        return ot.each(e.match(bt) || [], function(e, n) {
            t[n] = !0
        }),
            t
    }
    function r() {
        ht.addEventListener ? (ht.removeEventListener("DOMContentLoaded", s, !1),
            e.removeEventListener("load", s, !1)) : (ht.detachEvent("onreadystatechange", s),
            e.detachEvent("onload", s))
    }
    function s() {
        (ht.addEventListener || "load" === event.type || "complete" === ht.readyState) && (r(),
            ot.ready())
    }
    function l(e, t, n) {
        if (void 0 === n && 1 === e.nodeType) {
            var i = "data-" + t.replace(Et, "-$1").toLowerCase();
            if (n = e.getAttribute(i),
                "string" == typeof n) {
                try {
                    n = "true" === n ? !0 : "false" === n ? !1 : "null" === n ? null : +n + "" === n ? +n : Tt.test(n) ? ot.parseJSON(n) : n
                } catch (o) {}
                ot.data(e, t, n)
            } else
                n = void 0
        }
        return n
    }
    function c(e) {
        var t;
        for (t in e)
            if (("data" !== t || !ot.isEmptyObject(e[t])) && "toJSON" !== t)
                return !1;
        return !0
    }
    function u(e, t, n, i) {
        if (ot.acceptData(e)) {
            var o, a, r = ot.expando, s = e.nodeType, l = s ? ot.cache : e, c = s ? e[r] : e[r] && r;
            if (c && l[c] && (i || l[c].data) || void 0 !== n || "string" != typeof t)
                return c || (c = s ? e[r] = G.pop() || ot.guid++ : r),
                l[c] || (l[c] = s ? {} : {
                    toJSON: ot.noop
                }),
                ("object" == typeof t || "function" == typeof t) && (i ? l[c] = ot.extend(l[c], t) : l[c].data = ot.extend(l[c].data, t)),
                    a = l[c],
                i || (a.data || (a.data = {}),
                    a = a.data),
                void 0 !== n && (a[ot.camelCase(t)] = n),
                    "string" == typeof t ? (o = a[t],
                    null == o && (o = a[ot.camelCase(t)])) : o = a,
                    o
        }
    }
    function d(e, t, n) {
        if (ot.acceptData(e)) {
            var i, o, a = e.nodeType, r = a ? ot.cache : e, s = a ? e[ot.expando] : ot.expando;
            if (r[s]) {
                if (t && (i = n ? r[s] : r[s].data)) {
                    ot.isArray(t) ? t = t.concat(ot.map(t, ot.camelCase)) : t in i ? t = [t] : (t = ot.camelCase(t),
                        t = t in i ? [t] : t.split(" ")),
                        o = t.length;
                    for (; o--; )
                        delete i[t[o]];
                    if (n ? !c(i) : !ot.isEmptyObject(i))
                        return
                }
                (n || (delete r[s].data,
                    c(r[s]))) && (a ? ot.cleanData([e], !0) : nt.deleteExpando || r != r.window ? delete r[s] : r[s] = null)
            }
        }
    }
    function f() {
        return !0
    }
    function p() {
        return !1
    }
    function h() {
        try {
            return ht.activeElement
        } catch (e) {}
    }
    function m(e) {
        var t = Ht.split("|")
            , n = e.createDocumentFragment();
        if (n.createElement)
            for (; t.length; )
                n.createElement(t.pop());
        return n
    }
    function g(e, t) {
        var n, i, o = 0, a = typeof e.getElementsByTagName !== kt ? e.getElementsByTagName(t || "*") : typeof e.querySelectorAll !== kt ? e.querySelectorAll(t || "*") : void 0;
        if (!a)
            for (a = [],
                     n = e.childNodes || e; null != (i = n[o]); o++)
                !t || ot.nodeName(i, t) ? a.push(i) : ot.merge(a, g(i, t));
        return void 0 === t || t && ot.nodeName(e, t) ? ot.merge([e], a) : a
    }
    function v(e) {
        Dt.test(e.type) && (e.defaultChecked = e.checked)
    }
    function y(e, t) {
        return ot.nodeName(e, "table") && ot.nodeName(11 !== t.nodeType ? t : t.firstChild, "tr") ? e.getElementsByTagName("tbody")[0] || e.appendChild(e.ownerDocument.createElement("tbody")) : e
    }
    function b(e) {
        return e.type = (null !== ot.find.attr(e, "type")) + "/" + e.type,
            e
    }
    function x(e) {
        var t = Yt.exec(e.type);
        return t ? e.type = t[1] : e.removeAttribute("type"),
            e
    }
    function C(e, t) {
        for (var n, i = 0; null != (n = e[i]); i++)
            ot._data(n, "globalEval", !t || ot._data(t[i], "globalEval"))
    }
    function w(e, t) {
        if (1 === t.nodeType && ot.hasData(e)) {
            var n, i, o, a = ot._data(e), r = ot._data(t, a), s = a.events;
            if (s) {
                delete r.handle,
                    r.events = {};
                for (n in s)
                    for (i = 0,
                             o = s[n].length; o > i; i++)
                        ot.event.add(t, n, s[n][i])
            }
            r.data && (r.data = ot.extend({}, r.data))
        }
    }
    function k(e, t) {
        var n, i, o;
        if (1 === t.nodeType) {
            if (n = t.nodeName.toLowerCase(),
                !nt.noCloneEvent && t[ot.expando]) {
                o = ot._data(t);
                for (i in o.events)
                    ot.removeEvent(t, i, o.handle);
                t.removeAttribute(ot.expando)
            }
            "script" === n && t.text !== e.text ? (b(t).text = e.text,
                x(t)) : "object" === n ? (t.parentNode && (t.outerHTML = e.outerHTML),
            nt.html5Clone && e.innerHTML && !ot.trim(t.innerHTML) && (t.innerHTML = e.innerHTML)) : "input" === n && Dt.test(e.type) ? (t.defaultChecked = t.checked = e.checked,
            t.value !== e.value && (t.value = e.value)) : "option" === n ? t.defaultSelected = t.selected = e.defaultSelected : ("input" === n || "textarea" === n) && (t.defaultValue = e.defaultValue)
        }
    }
    function T(t, n) {
        var i, o = ot(n.createElement(t)).appendTo(n.body), a = e.getDefaultComputedStyle && (i = e.getDefaultComputedStyle(o[0])) ? i.display : ot.css(o[0], "display");
        return o.detach(),
            a
    }
    function E(e) {
        var t = ht
            , n = Zt[e];
        return n || (n = T(e, t),
        "none" !== n && n || (Kt = (Kt || ot("<iframe frameborder='0' width='0' height='0'/>")).appendTo(t.documentElement),
            t = (Kt[0].contentWindow || Kt[0].contentDocument).document,
            t.write(),
            t.close(),
            n = T(e, t),
            Kt.detach()),
            Zt[e] = n),
            n
    }
    function N(e, t) {
        return {
            get: function() {
                var n = e();
                if (null != n)
                    return n ? (delete this.get,
                        void 0) : (this.get = t).apply(this, arguments)
            }
        }
    }
    function S(e, t) {
        if (t in e)
            return t;
        for (var n = t.charAt(0).toUpperCase() + t.slice(1), i = t, o = pn.length; o--; )
            if (t = pn[o] + n,
                t in e)
                return t;
        return i
    }
    function L(e, t) {
        for (var n, i, o, a = [], r = 0, s = e.length; s > r; r++)
            i = e[r],
            i.style && (a[r] = ot._data(i, "olddisplay"),
                n = i.style.display,
                t ? (a[r] || "none" !== n || (i.style.display = ""),
                "" === i.style.display && Lt(i) && (a[r] = ot._data(i, "olddisplay", E(i.nodeName)))) : (o = Lt(i),
                (n && "none" !== n || !o) && ot._data(i, "olddisplay", o ? n : ot.css(i, "display"))));
        for (r = 0; s > r; r++)
            i = e[r],
            i.style && (t && "none" !== i.style.display && "" !== i.style.display || (i.style.display = t ? a[r] || "" : "none"));
        return e
    }
    function $(e, t, n) {
        var i = cn.exec(t);
        return i ? Math.max(0, i[1] - (n || 0)) + (i[2] || "px") : t
    }
    function D(e, t, n, i, o) {
        for (var a = n === (i ? "border" : "content") ? 4 : "width" === t ? 1 : 0, r = 0; 4 > a; a += 2)
            "margin" === n && (r += ot.css(e, n + St[a], !0, o)),
                i ? ("content" === n && (r -= ot.css(e, "padding" + St[a], !0, o)),
                "margin" !== n && (r -= ot.css(e, "border" + St[a] + "Width", !0, o))) : (r += ot.css(e, "padding" + St[a], !0, o),
                "padding" !== n && (r += ot.css(e, "border" + St[a] + "Width", !0, o)));
        return r
    }
    function M(e, t, n) {
        var i = !0
            , o = "width" === t ? e.offsetWidth : e.offsetHeight
            , a = en(e)
            , r = nt.boxSizing && "border-box" === ot.css(e, "boxSizing", !1, a);
        if (0 >= o || null == o) {
            if (o = tn(e, t, a),
                (0 > o || null == o) && (o = e.style[t]),
                    on.test(o))
                return o;
            i = r && (nt.boxSizingReliable() || o === e.style[t]),
                o = parseFloat(o) || 0
        }
        return o + D(e, t, n || (r ? "border" : "content"), i, a) + "px"
    }
    function A(e, t, n, i, o) {
        return new A.prototype.init(e,t,n,i,o)
    }
    function j() {
        return setTimeout(function() {
            hn = void 0
        }),
            hn = ot.now()
    }
    function I(e, t) {
        var n, i = {
            height: e
        }, o = 0;
        for (t = t ? 1 : 0; 4 > o; o += 2 - t)
            n = St[o],
                i["margin" + n] = i["padding" + n] = e;
        return t && (i.opacity = i.width = e),
            i
    }
    function O(e, t, n) {
        for (var i, o = (xn[t] || []).concat(xn["*"]), a = 0, r = o.length; r > a; a++)
            if (i = o[a].call(n, t, e))
                return i
    }
    function H(e, t, n) {
        var i, o, a, r, s, l, c, u, d = this, f = {}, p = e.style, h = e.nodeType && Lt(e), m = ot._data(e, "fxshow");
        n.queue || (s = ot._queueHooks(e, "fx"),
        null == s.unqueued && (s.unqueued = 0,
                l = s.empty.fire,
                s.empty.fire = function() {
                    s.unqueued || l()
                }
        ),
            s.unqueued++,
            d.always(function() {
                d.always(function() {
                    s.unqueued--,
                    ot.queue(e, "fx").length || s.empty.fire()
                })
            })),
        1 === e.nodeType && ("height"in t || "width"in t) && (n.overflow = [p.overflow, p.overflowX, p.overflowY],
            c = ot.css(e, "display"),
            u = "none" === c ? ot._data(e, "olddisplay") || E(e.nodeName) : c,
        "inline" === u && "none" === ot.css(e, "float") && (nt.inlineBlockNeedsLayout && "inline" !== E(e.nodeName) ? p.zoom = 1 : p.display = "inline-block")),
        n.overflow && (p.overflow = "hidden",
        nt.shrinkWrapBlocks() || d.always(function() {
            p.overflow = n.overflow[0],
                p.overflowX = n.overflow[1],
                p.overflowY = n.overflow[2]
        }));
        for (i in t)
            if (o = t[i],
                    gn.exec(o)) {
                if (delete t[i],
                        a = a || "toggle" === o,
                    o === (h ? "hide" : "show")) {
                    if ("show" !== o || !m || void 0 === m[i])
                        continue;
                    h = !0
                }
                f[i] = m && m[i] || ot.style(e, i)
            } else
                c = void 0;
        if (ot.isEmptyObject(f))
            "inline" === ("none" === c ? E(e.nodeName) : c) && (p.display = c);
        else {
            m ? "hidden"in m && (h = m.hidden) : m = ot._data(e, "fxshow", {}),
            a && (m.hidden = !h),
                h ? ot(e).show() : d.done(function() {
                    ot(e).hide()
                }),
                d.done(function() {
                    var t;
                    ot._removeData(e, "fxshow");
                    for (t in f)
                        ot.style(e, t, f[t])
                });
            for (i in f)
                r = O(h ? m[i] : 0, i, d),
                i in m || (m[i] = r.start,
                h && (r.end = r.start,
                    r.start = "width" === i || "height" === i ? 1 : 0))
        }
    }
    function P(e, t) {
        var n, i, o, a, r;
        for (n in e)
            if (i = ot.camelCase(n),
                    o = t[i],
                    a = e[n],
                ot.isArray(a) && (o = a[1],
                    a = e[n] = a[0]),
                n !== i && (e[i] = a,
                    delete e[n]),
                    r = ot.cssHooks[i],
                r && "expand"in r) {
                a = r.expand(a),
                    delete e[i];
                for (n in a)
                    n in e || (e[n] = a[n],
                        t[n] = o)
            } else
                t[i] = o
    }
    function F(e, t, n) {
        var i, o, a = 0, r = bn.length, s = ot.Deferred().always(function() {
            delete l.elem
        }), l = function() {
            if (o)
                return !1;
            for (var t = hn || j(), n = Math.max(0, c.startTime + c.duration - t), i = n / c.duration || 0, a = 1 - i, r = 0, l = c.tweens.length; l > r; r++)
                c.tweens[r].run(a);
            return s.notifyWith(e, [c, a, n]),
                1 > a && l ? n : (s.resolveWith(e, [c]),
                    !1)
        }, c = s.promise({
            elem: e,
            props: ot.extend({}, t),
            opts: ot.extend(!0, {
                specialEasing: {}
            }, n),
            originalProperties: t,
            originalOptions: n,
            startTime: hn || j(),
            duration: n.duration,
            tweens: [],
            createTween: function(t, n) {
                var i = ot.Tween(e, c.opts, t, n, c.opts.specialEasing[t] || c.opts.easing);
                return c.tweens.push(i),
                    i
            },
            stop: function(t) {
                var n = 0
                    , i = t ? c.tweens.length : 0;
                if (o)
                    return this;
                for (o = !0; i > n; n++)
                    c.tweens[n].run(1);
                return t ? s.resolveWith(e, [c, t]) : s.rejectWith(e, [c, t]),
                    this
            }
        }), u = c.props;
        for (P(u, c.opts.specialEasing); r > a; a++)
            if (i = bn[a].call(c, e, u, c.opts))
                return i;
        return ot.map(u, O, c),
        ot.isFunction(c.opts.start) && c.opts.start.call(e, c),
            ot.fx.timer(ot.extend(l, {
                elem: e,
                anim: c,
                queue: c.opts.queue
            })),
            c.progress(c.opts.progress).done(c.opts.done, c.opts.complete).fail(c.opts.fail).always(c.opts.always)
    }
    function B(e) {
        return function(t, n) {
            "string" != typeof t && (n = t,
                t = "*");
            var i, o = 0, a = t.toLowerCase().match(bt) || [];
            if (ot.isFunction(n))
                for (; i = a[o++]; )
                    "+" === i.charAt(0) ? (i = i.slice(1) || "*",
                        (e[i] = e[i] || []).unshift(n)) : (e[i] = e[i] || []).push(n)
        }
    }
    function _(e, t, n, i) {
        function o(s) {
            var l;
            return a[s] = !0,
                ot.each(e[s] || [], function(e, s) {
                    var c = s(t, n, i);
                    return "string" != typeof c || r || a[c] ? r ? !(l = c) : void 0 : (t.dataTypes.unshift(c),
                        o(c),
                        !1)
                }),
                l
        }
        var a = {}
            , r = e === Wn;
        return o(t.dataTypes[0]) || !a["*"] && o("*")
    }
    function q(e, t) {
        var n, i, o = ot.ajaxSettings.flatOptions || {};
        for (i in t)
            void 0 !== t[i] && ((o[i] ? e : n || (n = {}))[i] = t[i]);
        return n && ot.extend(!0, e, n),
            e
    }
    function z(e, t, n) {
        for (var i, o, a, r, s = e.contents, l = e.dataTypes; "*" === l[0]; )
            l.shift(),
            void 0 === o && (o = e.mimeType || t.getResponseHeader("Content-Type"));
        if (o)
            for (r in s)
                if (s[r] && s[r].test(o)) {
                    l.unshift(r);
                    break
                }
        if (l[0]in n)
            a = l[0];
        else {
            for (r in n) {
                if (!l[0] || e.converters[r + " " + l[0]]) {
                    a = r;
                    break
                }
                i || (i = r)
            }
            a = a || i
        }
        return a ? (a !== l[0] && l.unshift(a),
            n[a]) : void 0
    }
    function R(e, t, n, i) {
        var o, a, r, s, l, c = {}, u = e.dataTypes.slice();
        if (u[1])
            for (r in e.converters)
                c[r.toLowerCase()] = e.converters[r];
        for (a = u.shift(); a; )
            if (e.responseFields[a] && (n[e.responseFields[a]] = t),
                !l && i && e.dataFilter && (t = e.dataFilter(t, e.dataType)),
                    l = a,
                    a = u.shift())
                if ("*" === a)
                    a = l;
                else if ("*" !== l && l !== a) {
                    if (r = c[l + " " + a] || c["* " + a],
                            !r)
                        for (o in c)
                            if (s = o.split(" "),
                                s[1] === a && (r = c[l + " " + s[0]] || c["* " + s[0]])) {
                                r === !0 ? r = c[o] : c[o] !== !0 && (a = s[0],
                                    u.unshift(s[1]));
                                break
                            }
                    if (r !== !0)
                        if (r && e["throws"])
                            t = r(t);
                        else
                            try {
                                t = r(t)
                            } catch (d) {
                                return {
                                    state: "parsererror",
                                    error: r ? d : "No conversion from " + l + " to " + a
                                }
                            }
                }
        return {
            state: "success",
            data: t
        }
    }
    function W(e, t, n, i) {
        var o;
        if (ot.isArray(t))
            ot.each(t, function(t, o) {
                n || Gn.test(e) ? i(e, o) : W(e + "[" + ("object" == typeof o ? t : "") + "]", o, n, i)
            });
        else if (n || "object" !== ot.type(t))
            i(e, t);
        else
            for (o in t)
                W(e + "[" + o + "]", t[o], n, i)
    }
    function X() {
        try {
            return new e.XMLHttpRequest
        } catch (t) {}
    }
    function U() {
        try {
            return new e.ActiveXObject("Microsoft.XMLHTTP")
        } catch (t) {}
    }
    function Y(e) {
        return ot.isWindow(e) ? e : 9 === e.nodeType ? e.defaultView || e.parentWindow : !1
    }
    var G = []
        , V = G.slice
        , Q = G.concat
        , J = G.push
        , K = G.indexOf
        , Z = {}
        , et = Z.toString
        , tt = Z.hasOwnProperty
        , nt = {}
        , it = "1.11.1"
        , ot = function(e, t) {
        return new ot.fn.init(e,t)
    }
        , at = /^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g
        , rt = /^-ms-/
        , st = /-([\da-z])/gi
        , lt = function(e, t) {
        return t.toUpperCase()
    };
    ot.fn = ot.prototype = {
        jquery: it,
        constructor: ot,
        selector: "",
        length: 0,
        toArray: function() {
            return V.call(this)
        },
        get: function(e) {
            return null != e ? 0 > e ? this[e + this.length] : this[e] : V.call(this)
        },
        pushStack: function(e) {
            var t = ot.merge(this.constructor(), e);
            return t.prevObject = this,
                t.context = this.context,
                t
        },
        each: function(e, t) {
            return ot.each(this, e, t)
        },
        map: function(e) {
            return this.pushStack(ot.map(this, function(t, n) {
                return e.call(t, n, t)
            }))
        },
        slice: function() {
            return this.pushStack(V.apply(this, arguments))
        },
        first: function() {
            return this.eq(0)
        },
        last: function() {
            return this.eq(-1)
        },
        eq: function(e) {
            var t = this.length
                , n = +e + (0 > e ? t : 0);
            return this.pushStack(n >= 0 && t > n ? [this[n]] : [])
        },
        end: function() {
            return this.prevObject || this.constructor(null)
        },
        push: J,
        sort: G.sort,
        splice: G.splice
    },
        ot.extend = ot.fn.extend = function() {
            var e, t, n, i, o, a, r = arguments[0] || {}, s = 1, l = arguments.length, c = !1;
            for ("boolean" == typeof r && (c = r,
                r = arguments[s] || {},
                s++),
                 "object" == typeof r || ot.isFunction(r) || (r = {}),
                 s === l && (r = this,
                     s--); l > s; s++)
                if (null != (o = arguments[s]))
                    for (i in o)
                        e = r[i],
                            n = o[i],
                        r !== n && (c && n && (ot.isPlainObject(n) || (t = ot.isArray(n))) ? (t ? (t = !1,
                            a = e && ot.isArray(e) ? e : []) : a = e && ot.isPlainObject(e) ? e : {},
                            r[i] = ot.extend(c, a, n)) : void 0 !== n && (r[i] = n));
            return r
        }
        ,
        ot.extend({
            expando: "jQuery" + (it + Math.random()).replace(/\D/g, ""),
            isReady: !0,
            error: function(e) {
                throw new Error(e)
            },
            noop: function() {},
            isFunction: function(e) {
                return "function" === ot.type(e)
            },
            isArray: Array.isArray || function(e) {
                return "array" === ot.type(e)
            }
            ,
            isWindow: function(e) {
                return null != e && e == e.window
            },
            isNumeric: function(e) {
                return !ot.isArray(e) && e - parseFloat(e) >= 0
            },
            isEmptyObject: function(e) {
                var t;
                for (t in e)
                    return !1;
                return !0
            },
            isPlainObject: function(e) {
                var t;
                if (!e || "object" !== ot.type(e) || e.nodeType || ot.isWindow(e))
                    return !1;
                try {
                    if (e.constructor && !tt.call(e, "constructor") && !tt.call(e.constructor.prototype, "isPrototypeOf"))
                        return !1
                } catch (n) {
                    return !1
                }
                if (nt.ownLast)
                    for (t in e)
                        return tt.call(e, t);
                for (t in e)
                    ;
                return void 0 === t || tt.call(e, t)
            },
            type: function(e) {
                return null == e ? e + "" : "object" == typeof e || "function" == typeof e ? Z[et.call(e)] || "object" : typeof e
            },
            globalEval: function(t) {
                t && ot.trim(t) && (e.execScript || function(t) {
                        e.eval.call(e, t)
                    }
                )(t)
            },
            camelCase: function(e) {
                return e.replace(rt, "ms-").replace(st, lt)
            },
            nodeName: function(e, t) {
                return e.nodeName && e.nodeName.toLowerCase() === t.toLowerCase()
            },
            each: function(e, t, i) {
                var o, a = 0, r = e.length, s = n(e);
                if (i) {
                    if (s)
                        for (; r > a && (o = t.apply(e[a], i),
                        o !== !1); a++)
                            ;
                    else
                        for (a in e)
                            if (o = t.apply(e[a], i),
                                o === !1)
                                break
                } else if (s)
                    for (; r > a && (o = t.call(e[a], a, e[a]),
                    o !== !1); a++)
                        ;
                else
                    for (a in e)
                        if (o = t.call(e[a], a, e[a]),
                            o === !1)
                            break;
                return e
            },
            trim: function(e) {
                return null == e ? "" : (e + "").replace(at, "")
            },
            makeArray: function(e, t) {
                var i = t || [];
                return null != e && (n(Object(e)) ? ot.merge(i, "string" == typeof e ? [e] : e) : J.call(i, e)),
                    i
            },
            inArray: function(e, t, n) {
                var i;
                if (t) {
                    if (K)
                        return K.call(t, e, n);
                    for (i = t.length,
                             n = n ? 0 > n ? Math.max(0, i + n) : n : 0; i > n; n++)
                        if (n in t && t[n] === e)
                            return n
                }
                return -1
            },
            merge: function(e, t) {
                for (var n = +t.length, i = 0, o = e.length; n > i; )
                    e[o++] = t[i++];
                if (n !== n)
                    for (; void 0 !== t[i]; )
                        e[o++] = t[i++];
                return e.length = o,
                    e
            },
            grep: function(e, t, n) {
                for (var i, o = [], a = 0, r = e.length, s = !n; r > a; a++)
                    i = !t(e[a], a),
                    i !== s && o.push(e[a]);
                return o
            },
            map: function(e, t, i) {
                var o, a = 0, r = e.length, s = n(e), l = [];
                if (s)
                    for (; r > a; a++)
                        o = t(e[a], a, i),
                        null != o && l.push(o);
                else
                    for (a in e)
                        o = t(e[a], a, i),
                        null != o && l.push(o);
                return Q.apply([], l)
            },
            guid: 1,
            proxy: function(e, t) {
                var n, i, o;
                return "string" == typeof t && (o = e[t],
                    t = e,
                    e = o),
                    ot.isFunction(e) ? (n = V.call(arguments, 2),
                        i = function() {
                            return e.apply(t || this, n.concat(V.call(arguments)))
                        }
                        ,
                        i.guid = e.guid = e.guid || ot.guid++,
                        i) : void 0
            },
            now: function() {
                return +new Date
            },
            support: nt
        }),
        ot.each("Boolean Number String Function Array Date RegExp Object Error".split(" "), function(e, t) {
            Z["[object " + t + "]"] = t.toLowerCase()
        });
    var ct = function(e) {
        function t(e, t, n, i) {
            var o, a, r, s, l, c, d, p, h, m;
            if ((t ? t.ownerDocument || t : _) !== A && M(t),
                    t = t || A,
                    n = n || [],
                !e || "string" != typeof e)
                return n;
            if (1 !== (s = t.nodeType) && 9 !== s)
                return [];
            if (I && !i) {
                if (o = yt.exec(e))
                    if (r = o[1]) {
                        if (9 === s) {
                            if (a = t.getElementById(r),
                                !a || !a.parentNode)
                                return n;
                            if (a.id === r)
                                return n.push(a),
                                    n
                        } else if (t.ownerDocument && (a = t.ownerDocument.getElementById(r)) && F(t, a) && a.id === r)
                            return n.push(a),
                                n
                    } else {
                        if (o[2])
                            return Z.apply(n, t.getElementsByTagName(e)),
                                n;
                        if ((r = o[3]) && C.getElementsByClassName && t.getElementsByClassName)
                            return Z.apply(n, t.getElementsByClassName(r)),
                                n
                    }
                if (C.qsa && (!O || !O.test(e))) {
                    if (p = d = B,
                            h = t,
                            m = 9 === s && e,
                        1 === s && "object" !== t.nodeName.toLowerCase()) {
                        for (c = E(e),
                                 (d = t.getAttribute("id")) ? p = d.replace(xt, "\\$&") : t.setAttribute("id", p),
                                 p = "[id='" + p + "'] ",
                                 l = c.length; l--; )
                            c[l] = p + f(c[l]);
                        h = bt.test(e) && u(t.parentNode) || t,
                            m = c.join(",")
                    }
                    if (m)
                        try {
                            return Z.apply(n, h.querySelectorAll(m)),
                                n
                        } catch (g) {} finally {
                            d || t.removeAttribute("id")
                        }
                }
            }
            return S(e.replace(lt, "$1"), t, n, i)
        }
        function n() {
            function e(n, i) {
                return t.push(n + " ") > w.cacheLength && delete e[t.shift()],
                    e[n + " "] = i
            }
            var t = [];
            return e
        }
        function i(e) {
            return e[B] = !0,
                e
        }
        function o(e) {
            var t = A.createElement("div");
            try {
                return !!e(t)
            } catch (n) {
                return !1
            } finally {
                t.parentNode && t.parentNode.removeChild(t),
                    t = null
            }
        }
        function a(e, t) {
            for (var n = e.split("|"), i = e.length; i--; )
                w.attrHandle[n[i]] = t
        }
        function r(e, t) {
            var n = t && e
                , i = n && 1 === e.nodeType && 1 === t.nodeType && (~t.sourceIndex || G) - (~e.sourceIndex || G);
            if (i)
                return i;
            if (n)
                for (; n = n.nextSibling; )
                    if (n === t)
                        return -1;
            return e ? 1 : -1
        }
        function s(e) {
            return function(t) {
                var n = t.nodeName.toLowerCase();
                return "input" === n && t.type === e
            }
        }
        function l(e) {
            return function(t) {
                var n = t.nodeName.toLowerCase();
                return ("input" === n || "button" === n) && t.type === e
            }
        }
        function c(e) {
            return i(function(t) {
                return t = +t,
                    i(function(n, i) {
                        for (var o, a = e([], n.length, t), r = a.length; r--; )
                            n[o = a[r]] && (n[o] = !(i[o] = n[o]))
                    })
            })
        }
        function u(e) {
            return e && typeof e.getElementsByTagName !== Y && e
        }
        function d() {}
        function f(e) {
            for (var t = 0, n = e.length, i = ""; n > t; t++)
                i += e[t].value;
            return i
        }
        function p(e, t, n) {
            var i = t.dir
                , o = n && "parentNode" === i
                , a = z++;
            return t.first ? function(t, n, a) {
                    for (; t = t[i]; )
                        if (1 === t.nodeType || o)
                            return e(t, n, a)
                }
                : function(t, n, r) {
                    var s, l, c = [q, a];
                    if (r) {
                        for (; t = t[i]; )
                            if ((1 === t.nodeType || o) && e(t, n, r))
                                return !0
                    } else
                        for (; t = t[i]; )
                            if (1 === t.nodeType || o) {
                                if (l = t[B] || (t[B] = {}),
                                    (s = l[i]) && s[0] === q && s[1] === a)
                                    return c[2] = s[2];
                                if (l[i] = c,
                                        c[2] = e(t, n, r))
                                    return !0
                            }
                }
        }
        function h(e) {
            return e.length > 1 ? function(t, n, i) {
                    for (var o = e.length; o--; )
                        if (!e[o](t, n, i))
                            return !1;
                    return !0
                }
                : e[0]
        }
        function m(e, n, i) {
            for (var o = 0, a = n.length; a > o; o++)
                t(e, n[o], i);
            return i
        }
        function g(e, t, n, i, o) {
            for (var a, r = [], s = 0, l = e.length, c = null != t; l > s; s++)
                (a = e[s]) && (!n || n(a, i, o)) && (r.push(a),
                c && t.push(s));
            return r
        }
        function v(e, t, n, o, a, r) {
            return o && !o[B] && (o = v(o)),
            a && !a[B] && (a = v(a, r)),
                i(function(i, r, s, l) {
                    var c, u, d, f = [], p = [], h = r.length, v = i || m(t || "*", s.nodeType ? [s] : s, []), y = !e || !i && t ? v : g(v, f, e, s, l), b = n ? a || (i ? e : h || o) ? [] : r : y;
                    if (n && n(y, b, s, l),
                            o)
                        for (c = g(b, p),
                                 o(c, [], s, l),
                                 u = c.length; u--; )
                            (d = c[u]) && (b[p[u]] = !(y[p[u]] = d));
                    if (i) {
                        if (a || e) {
                            if (a) {
                                for (c = [],
                                         u = b.length; u--; )
                                    (d = b[u]) && c.push(y[u] = d);
                                a(null, b = [], c, l)
                            }
                            for (u = b.length; u--; )
                                (d = b[u]) && (c = a ? tt.call(i, d) : f[u]) > -1 && (i[c] = !(r[c] = d))
                        }
                    } else
                        b = g(b === r ? b.splice(h, b.length) : b),
                            a ? a(null, r, b, l) : Z.apply(r, b)
                })
        }
        function y(e) {
            for (var t, n, i, o = e.length, a = w.relative[e[0].type], r = a || w.relative[" "], s = a ? 1 : 0, l = p(function(e) {
                return e === t
            }, r, !0), c = p(function(e) {
                return tt.call(t, e) > -1
            }, r, !0), u = [function(e, n, i) {
                return !a && (i || n !== L) || ((t = n).nodeType ? l(e, n, i) : c(e, n, i))
            }
            ]; o > s; s++)
                if (n = w.relative[e[s].type])
                    u = [p(h(u), n)];
                else {
                    if (n = w.filter[e[s].type].apply(null, e[s].matches),
                            n[B]) {
                        for (i = ++s; o > i && !w.relative[e[i].type]; i++)
                            ;
                        return v(s > 1 && h(u), s > 1 && f(e.slice(0, s - 1).concat({
                            value: " " === e[s - 2].type ? "*" : ""
                        })).replace(lt, "$1"), n, i > s && y(e.slice(s, i)), o > i && y(e = e.slice(i)), o > i && f(e))
                    }
                    u.push(n)
                }
            return h(u)
        }
        function b(e, n) {
            var o = n.length > 0
                , a = e.length > 0
                , r = function(i, r, s, l, c) {
                var u, d, f, p = 0, h = "0", m = i && [], v = [], y = L, b = i || a && w.find.TAG("*", c), x = q += null == y ? 1 : Math.random() || .1, C = b.length;
                for (c && (L = r !== A && r); h !== C && null != (u = b[h]); h++) {
                    if (a && u) {
                        for (d = 0; f = e[d++]; )
                            if (f(u, r, s)) {
                                l.push(u);
                                break
                            }
                        c && (q = x)
                    }
                    o && ((u = !f && u) && p--,
                    i && m.push(u))
                }
                if (p += h,
                    o && h !== p) {
                    for (d = 0; f = n[d++]; )
                        f(m, v, r, s);
                    if (i) {
                        if (p > 0)
                            for (; h--; )
                                m[h] || v[h] || (v[h] = J.call(l));
                        v = g(v)
                    }
                    Z.apply(l, v),
                    c && !i && v.length > 0 && p + n.length > 1 && t.uniqueSort(l)
                }
                return c && (q = x,
                    L = y),
                    m
            };
            return o ? i(r) : r
        }
        var x, C, w, k, T, E, N, S, L, $, D, M, A, j, I, O, H, P, F, B = "sizzle" + -new Date, _ = e.document, q = 0, z = 0, R = n(), W = n(), X = n(), U = function(e, t) {
            return e === t && (D = !0),
                0
        }, Y = "undefined", G = 1 << 31, V = {}.hasOwnProperty, Q = [], J = Q.pop, K = Q.push, Z = Q.push, et = Q.slice, tt = Q.indexOf || function(e) {
            for (var t = 0, n = this.length; n > t; t++)
                if (this[t] === e)
                    return t;
            return -1
        }
            , nt = "checked|selected|async|autofocus|autoplay|controls|defer|disabled|hidden|ismap|loop|multiple|open|readonly|required|scoped", it = "[\\x20\\t\\r\\n\\f]", ot = "(?:\\\\.|[\\w-]|[^\\x00-\\xa0])+", at = ot.replace("w", "w#"), rt = "\\[" + it + "*(" + ot + ")(?:" + it + "*([*^$|!~]?=)" + it + "*(?:'((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\"|(" + at + "))|)" + it + "*\\]", st = ":(" + ot + ")(?:\\((" + "('((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\")|" + "((?:\\\\.|[^\\\\()[\\]]|" + rt + ")*)|" + ".*" + ")\\)|)", lt = new RegExp("^" + it + "+|((?:^|[^\\\\])(?:\\\\.)*)" + it + "+$","g"), ct = new RegExp("^" + it + "*," + it + "*"), ut = new RegExp("^" + it + "*([>+~]|" + it + ")" + it + "*"), dt = new RegExp("=" + it + "*([^\\]'\"]*?)" + it + "*\\]","g"), ft = new RegExp(st), pt = new RegExp("^" + at + "$"), ht = {
            ID: new RegExp("^#(" + ot + ")"),
            CLASS: new RegExp("^\\.(" + ot + ")"),
            TAG: new RegExp("^(" + ot.replace("w", "w*") + ")"),
            ATTR: new RegExp("^" + rt),
            PSEUDO: new RegExp("^" + st),
            CHILD: new RegExp("^:(only|first|last|nth|nth-last)-(child|of-type)(?:\\(" + it + "*(even|odd|(([+-]|)(\\d*)n|)" + it + "*(?:([+-]|)" + it + "*(\\d+)|))" + it + "*\\)|)","i"),
            bool: new RegExp("^(?:" + nt + ")$","i"),
            needsContext: new RegExp("^" + it + "*[>+~]|:(even|odd|eq|gt|lt|nth|first|last)(?:\\(" + it + "*((?:-\\d)?\\d*)" + it + "*\\)|)(?=[^-]|$)","i")
        }, mt = /^(?:input|select|textarea|button)$/i, gt = /^h\d$/i, vt = /^[^{]+\{\s*\[native \w/, yt = /^(?:#([\w-]+)|(\w+)|\.([\w-]+))$/, bt = /[+~]/, xt = /'|\\/g, Ct = new RegExp("\\\\([\\da-f]{1,6}" + it + "?|(" + it + ")|.)","ig"), wt = function(e, t, n) {
            var i = "0x" + t - 65536;
            return i !== i || n ? t : 0 > i ? String.fromCharCode(i + 65536) : String.fromCharCode(55296 | i >> 10, 56320 | 1023 & i)
        };
        try {
            Z.apply(Q = et.call(_.childNodes), _.childNodes),
                Q[_.childNodes.length].nodeType
        } catch (kt) {
            Z = {
                apply: Q.length ? function(e, t) {
                        K.apply(e, et.call(t))
                    }
                    : function(e, t) {
                        for (var n = e.length, i = 0; e[n++] = t[i++]; )
                            ;
                        e.length = n - 1
                    }
            }
        }
        C = t.support = {},
            T = t.isXML = function(e) {
                var t = e && (e.ownerDocument || e).documentElement;
                return t ? "HTML" !== t.nodeName : !1
            }
            ,
            M = t.setDocument = function(e) {
                var t, n = e ? e.ownerDocument || e : _, i = n.defaultView;
                return n !== A && 9 === n.nodeType && n.documentElement ? (A = n,
                    j = n.documentElement,
                    I = !T(n),
                i && i !== i.top && (i.addEventListener ? i.addEventListener("unload", function() {
                    M()
                }, !1) : i.attachEvent && i.attachEvent("onunload", function() {
                    M()
                })),
                    C.attributes = o(function(e) {
                        return e.className = "i",
                            !e.getAttribute("className")
                    }),
                    C.getElementsByTagName = o(function(e) {
                        return e.appendChild(n.createComment("")),
                            !e.getElementsByTagName("*").length
                    }),
                    C.getElementsByClassName = vt.test(n.getElementsByClassName) && o(function(e) {
                        return e.innerHTML = "<div class='a'></div><div class='a i'></div>",
                            e.firstChild.className = "i",
                        2 === e.getElementsByClassName("i").length
                    }),
                    C.getById = o(function(e) {
                        return j.appendChild(e).id = B,
                        !n.getElementsByName || !n.getElementsByName(B).length
                    }),
                    C.getById ? (w.find.ID = function(e, t) {
                            if (typeof t.getElementById !== Y && I) {
                                var n = t.getElementById(e);
                                return n && n.parentNode ? [n] : []
                            }
                        }
                            ,
                            w.filter.ID = function(e) {
                                var t = e.replace(Ct, wt);
                                return function(e) {
                                    return e.getAttribute("id") === t
                                }
                            }
                    ) : (delete w.find.ID,
                            w.filter.ID = function(e) {
                                var t = e.replace(Ct, wt);
                                return function(e) {
                                    var n = typeof e.getAttributeNode !== Y && e.getAttributeNode("id");
                                    return n && n.value === t
                                }
                            }
                    ),
                    w.find.TAG = C.getElementsByTagName ? function(e, t) {
                            return typeof t.getElementsByTagName !== Y ? t.getElementsByTagName(e) : void 0
                        }
                        : function(e, t) {
                            var n, i = [], o = 0, a = t.getElementsByTagName(e);
                            if ("*" === e) {
                                for (; n = a[o++]; )
                                    1 === n.nodeType && i.push(n);
                                return i
                            }
                            return a
                        }
                    ,
                    w.find.CLASS = C.getElementsByClassName && function(e, t) {
                        return typeof t.getElementsByClassName !== Y && I ? t.getElementsByClassName(e) : void 0
                    }
                    ,
                    H = [],
                    O = [],
                (C.qsa = vt.test(n.querySelectorAll)) && (o(function(e) {
                    e.innerHTML = "<select msallowclip=''><option selected=''></option></select>",
                    e.querySelectorAll("[msallowclip^='']").length && O.push("[*^$]=" + it + "*(?:''|\"\")"),
                    e.querySelectorAll("[selected]").length || O.push("\\[" + it + "*(?:value|" + nt + ")"),
                    e.querySelectorAll(":checked").length || O.push(":checked")
                }),
                    o(function(e) {
                        var t = n.createElement("input");
                        t.setAttribute("type", "hidden"),
                            e.appendChild(t).setAttribute("name", "D"),
                        e.querySelectorAll("[name=d]").length && O.push("name" + it + "*[*^$|!~]?="),
                        e.querySelectorAll(":enabled").length || O.push(":enabled", ":disabled"),
                            e.querySelectorAll("*,:x"),
                            O.push(",.*:")
                    })),
                (C.matchesSelector = vt.test(P = j.matches || j.webkitMatchesSelector || j.mozMatchesSelector || j.oMatchesSelector || j.msMatchesSelector)) && o(function(e) {
                    C.disconnectedMatch = P.call(e, "div"),
                        P.call(e, "[s!='']:x"),
                        H.push("!=", st)
                }),
                    O = O.length && new RegExp(O.join("|")),
                    H = H.length && new RegExp(H.join("|")),
                    t = vt.test(j.compareDocumentPosition),
                    F = t || vt.test(j.contains) ? function(e, t) {
                            var n = 9 === e.nodeType ? e.documentElement : e
                                , i = t && t.parentNode;
                            return e === i || !(!i || 1 !== i.nodeType || !(n.contains ? n.contains(i) : e.compareDocumentPosition && 16 & e.compareDocumentPosition(i)))
                        }
                        : function(e, t) {
                            if (t)
                                for (; t = t.parentNode; )
                                    if (t === e)
                                        return !0;
                            return !1
                        }
                    ,
                    U = t ? function(e, t) {
                            if (e === t)
                                return D = !0,
                                    0;
                            var i = !e.compareDocumentPosition - !t.compareDocumentPosition;
                            return i ? i : (i = (e.ownerDocument || e) === (t.ownerDocument || t) ? e.compareDocumentPosition(t) : 1,
                                1 & i || !C.sortDetached && t.compareDocumentPosition(e) === i ? e === n || e.ownerDocument === _ && F(_, e) ? -1 : t === n || t.ownerDocument === _ && F(_, t) ? 1 : $ ? tt.call($, e) - tt.call($, t) : 0 : 4 & i ? -1 : 1)
                        }
                        : function(e, t) {
                            if (e === t)
                                return D = !0,
                                    0;
                            var i, o = 0, a = e.parentNode, s = t.parentNode, l = [e], c = [t];
                            if (!a || !s)
                                return e === n ? -1 : t === n ? 1 : a ? -1 : s ? 1 : $ ? tt.call($, e) - tt.call($, t) : 0;
                            if (a === s)
                                return r(e, t);
                            for (i = e; i = i.parentNode; )
                                l.unshift(i);
                            for (i = t; i = i.parentNode; )
                                c.unshift(i);
                            for (; l[o] === c[o]; )
                                o++;
                            return o ? r(l[o], c[o]) : l[o] === _ ? -1 : c[o] === _ ? 1 : 0
                        }
                    ,
                    n) : A
            }
            ,
            t.matches = function(e, n) {
                return t(e, null, null, n)
            }
            ,
            t.matchesSelector = function(e, n) {
                if ((e.ownerDocument || e) !== A && M(e),
                        n = n.replace(dt, "='$1']"),
                        !(!C.matchesSelector || !I || H && H.test(n) || O && O.test(n)))
                    try {
                        var i = P.call(e, n);
                        if (i || C.disconnectedMatch || e.document && 11 !== e.document.nodeType)
                            return i
                    } catch (o) {}
                return t(n, A, null, [e]).length > 0
            }
            ,
            t.contains = function(e, t) {
                return (e.ownerDocument || e) !== A && M(e),
                    F(e, t)
            }
            ,
            t.attr = function(e, t) {
                (e.ownerDocument || e) !== A && M(e);
                var n = w.attrHandle[t.toLowerCase()]
                    , i = n && V.call(w.attrHandle, t.toLowerCase()) ? n(e, t, !I) : void 0;
                return void 0 !== i ? i : C.attributes || !I ? e.getAttribute(t) : (i = e.getAttributeNode(t)) && i.specified ? i.value : null
            }
            ,
            t.error = function(e) {
                throw new Error("Syntax error, unrecognized expression: " + e)
            }
            ,
            t.uniqueSort = function(e) {
                var t, n = [], i = 0, o = 0;
                if (D = !C.detectDuplicates,
                        $ = !C.sortStable && e.slice(0),
                        e.sort(U),
                        D) {
                    for (; t = e[o++]; )
                        t === e[o] && (i = n.push(o));
                    for (; i--; )
                        e.splice(n[i], 1)
                }
                return $ = null,
                    e
            }
            ,
            k = t.getText = function(e) {
                var t, n = "", i = 0, o = e.nodeType;
                if (o) {
                    if (1 === o || 9 === o || 11 === o) {
                        if ("string" == typeof e.textContent)
                            return e.textContent;
                        for (e = e.firstChild; e; e = e.nextSibling)
                            n += k(e)
                    } else if (3 === o || 4 === o)
                        return e.nodeValue
                } else
                    for (; t = e[i++]; )
                        n += k(t);
                return n
            }
            ,
            w = t.selectors = {
                cacheLength: 50,
                createPseudo: i,
                match: ht,
                attrHandle: {},
                find: {},
                relative: {
                    ">": {
                        dir: "parentNode",
                        first: !0
                    },
                    " ": {
                        dir: "parentNode"
                    },
                    "+": {
                        dir: "previousSibling",
                        first: !0
                    },
                    "~": {
                        dir: "previousSibling"
                    }
                },
                preFilter: {
                    ATTR: function(e) {
                        return e[1] = e[1].replace(Ct, wt),
                            e[3] = (e[3] || e[4] || e[5] || "").replace(Ct, wt),
                        "~=" === e[2] && (e[3] = " " + e[3] + " "),
                            e.slice(0, 4)
                    },
                    CHILD: function(e) {
                        return e[1] = e[1].toLowerCase(),
                            "nth" === e[1].slice(0, 3) ? (e[3] || t.error(e[0]),
                                e[4] = +(e[4] ? e[5] + (e[6] || 1) : 2 * ("even" === e[3] || "odd" === e[3])),
                                e[5] = +(e[7] + e[8] || "odd" === e[3])) : e[3] && t.error(e[0]),
                            e
                    },
                    PSEUDO: function(e) {
                        var t, n = !e[6] && e[2];
                        return ht.CHILD.test(e[0]) ? null : (e[3] ? e[2] = e[4] || e[5] || "" : n && ft.test(n) && (t = E(n, !0)) && (t = n.indexOf(")", n.length - t) - n.length) && (e[0] = e[0].slice(0, t),
                            e[2] = n.slice(0, t)),
                            e.slice(0, 3))
                    }
                },
                filter: {
                    TAG: function(e) {
                        var t = e.replace(Ct, wt).toLowerCase();
                        return "*" === e ? function() {
                                return !0
                            }
                            : function(e) {
                                return e.nodeName && e.nodeName.toLowerCase() === t
                            }
                    },
                    CLASS: function(e) {
                        var t = R[e + " "];
                        return t || (t = new RegExp("(^|" + it + ")" + e + "(" + it + "|$)")) && R(e, function(e) {
                            return t.test("string" == typeof e.className && e.className || typeof e.getAttribute !== Y && e.getAttribute("class") || "")
                        })
                    },
                    ATTR: function(e, n, i) {
                        return function(o) {
                            var a = t.attr(o, e);
                            return null == a ? "!=" === n : n ? (a += "",
                                "=" === n ? a === i : "!=" === n ? a !== i : "^=" === n ? i && 0 === a.indexOf(i) : "*=" === n ? i && a.indexOf(i) > -1 : "$=" === n ? i && a.slice(-i.length) === i : "~=" === n ? (" " + a + " ").indexOf(i) > -1 : "|=" === n ? a === i || a.slice(0, i.length + 1) === i + "-" : !1) : !0
                        }
                    },
                    CHILD: function(e, t, n, i, o) {
                        var a = "nth" !== e.slice(0, 3)
                            , r = "last" !== e.slice(-4)
                            , s = "of-type" === t;
                        return 1 === i && 0 === o ? function(e) {
                                return !!e.parentNode
                            }
                            : function(t, n, l) {
                                var c, u, d, f, p, h, m = a !== r ? "nextSibling" : "previousSibling", g = t.parentNode, v = s && t.nodeName.toLowerCase(), y = !l && !s;
                                if (g) {
                                    if (a) {
                                        for (; m; ) {
                                            for (d = t; d = d[m]; )
                                                if (s ? d.nodeName.toLowerCase() === v : 1 === d.nodeType)
                                                    return !1;
                                            h = m = "only" === e && !h && "nextSibling"
                                        }
                                        return !0
                                    }
                                    if (h = [r ? g.firstChild : g.lastChild],
                                        r && y) {
                                        for (u = g[B] || (g[B] = {}),
                                                 c = u[e] || [],
                                                 p = c[0] === q && c[1],
                                                 f = c[0] === q && c[2],
                                                 d = p && g.childNodes[p]; d = ++p && d && d[m] || (f = p = 0) || h.pop(); )
                                            if (1 === d.nodeType && ++f && d === t) {
                                                u[e] = [q, p, f];
                                                break
                                            }
                                    } else if (y && (c = (t[B] || (t[B] = {}))[e]) && c[0] === q)
                                        f = c[1];
                                    else
                                        for (; (d = ++p && d && d[m] || (f = p = 0) || h.pop()) && ((s ? d.nodeName.toLowerCase() !== v : 1 !== d.nodeType) || !++f || (y && ((d[B] || (d[B] = {}))[e] = [q, f]),
                                        d !== t)); )
                                            ;
                                    return f -= o,
                                    f === i || 0 === f % i && f / i >= 0
                                }
                            }
                    },
                    PSEUDO: function(e, n) {
                        var o, a = w.pseudos[e] || w.setFilters[e.toLowerCase()] || t.error("unsupported pseudo: " + e);
                        return a[B] ? a(n) : a.length > 1 ? (o = [e, e, "", n],
                                w.setFilters.hasOwnProperty(e.toLowerCase()) ? i(function(e, t) {
                                    for (var i, o = a(e, n), r = o.length; r--; )
                                        i = tt.call(e, o[r]),
                                            e[i] = !(t[i] = o[r])
                                }) : function(e) {
                                    return a(e, 0, o)
                                }
                        ) : a
                    }
                },
                pseudos: {
                    not: i(function(e) {
                        var t = []
                            , n = []
                            , o = N(e.replace(lt, "$1"));
                        return o[B] ? i(function(e, t, n, i) {
                            for (var a, r = o(e, null, i, []), s = e.length; s--; )
                                (a = r[s]) && (e[s] = !(t[s] = a))
                        }) : function(e, i, a) {
                            return t[0] = e,
                                o(t, null, a, n),
                                !n.pop()
                        }
                    }),
                    has: i(function(e) {
                        return function(n) {
                            return t(e, n).length > 0
                        }
                    }),
                    contains: i(function(e) {
                        return function(t) {
                            return (t.textContent || t.innerText || k(t)).indexOf(e) > -1
                        }
                    }),
                    lang: i(function(e) {
                        return pt.test(e || "") || t.error("unsupported lang: " + e),
                            e = e.replace(Ct, wt).toLowerCase(),
                            function(t) {
                                var n;
                                do
                                    if (n = I ? t.lang : t.getAttribute("xml:lang") || t.getAttribute("lang"))
                                        return n = n.toLowerCase(),
                                        n === e || 0 === n.indexOf(e + "-");
                                while ((t = t.parentNode) && 1 === t.nodeType);return !1
                            }
                    }),
                    target: function(t) {
                        var n = e.location && e.location.hash;
                        return n && n.slice(1) === t.id
                    },
                    root: function(e) {
                        return e === j
                    },
                    focus: function(e) {
                        return e === A.activeElement && (!A.hasFocus || A.hasFocus()) && !!(e.type || e.href || ~e.tabIndex)
                    },
                    enabled: function(e) {
                        return e.disabled === !1
                    },
                    disabled: function(e) {
                        return e.disabled === !0
                    },
                    checked: function(e) {
                        var t = e.nodeName.toLowerCase();
                        return "input" === t && !!e.checked || "option" === t && !!e.selected
                    },
                    selected: function(e) {
                        return e.parentNode && e.parentNode.selectedIndex,
                        e.selected === !0
                    },
                    empty: function(e) {
                        for (e = e.firstChild; e; e = e.nextSibling)
                            if (e.nodeType < 6)
                                return !1;
                        return !0
                    },
                    parent: function(e) {
                        return !w.pseudos.empty(e)
                    },
                    header: function(e) {
                        return gt.test(e.nodeName)
                    },
                    input: function(e) {
                        return mt.test(e.nodeName)
                    },
                    button: function(e) {
                        var t = e.nodeName.toLowerCase();
                        return "input" === t && "button" === e.type || "button" === t
                    },
                    text: function(e) {
                        var t;
                        return "input" === e.nodeName.toLowerCase() && "text" === e.type && (null == (t = e.getAttribute("type")) || "text" === t.toLowerCase())
                    },
                    first: c(function() {
                        return [0]
                    }),
                    last: c(function(e, t) {
                        return [t - 1]
                    }),
                    eq: c(function(e, t, n) {
                        return [0 > n ? n + t : n]
                    }),
                    even: c(function(e, t) {
                        for (var n = 0; t > n; n += 2)
                            e.push(n);
                        return e
                    }),
                    odd: c(function(e, t) {
                        for (var n = 1; t > n; n += 2)
                            e.push(n);
                        return e
                    }),
                    lt: c(function(e, t, n) {
                        for (var i = 0 > n ? n + t : n; --i >= 0; )
                            e.push(i);
                        return e
                    }),
                    gt: c(function(e, t, n) {
                        for (var i = 0 > n ? n + t : n; ++i < t; )
                            e.push(i);
                        return e
                    })
                }
            },
            w.pseudos.nth = w.pseudos.eq;
        for (x in {
            radio: !0,
            checkbox: !0,
            file: !0,
            password: !0,
            image: !0
        })
            w.pseudos[x] = s(x);
        for (x in {
            submit: !0,
            reset: !0
        })
            w.pseudos[x] = l(x);
        return d.prototype = w.filters = w.pseudos,
            w.setFilters = new d,
            E = t.tokenize = function(e, n) {
                var i, o, a, r, s, l, c, u = W[e + " "];
                if (u)
                    return n ? 0 : u.slice(0);
                for (s = e,
                         l = [],
                         c = w.preFilter; s; ) {
                    (!i || (o = ct.exec(s))) && (o && (s = s.slice(o[0].length) || s),
                        l.push(a = [])),
                        i = !1,
                    (o = ut.exec(s)) && (i = o.shift(),
                        a.push({
                            value: i,
                            type: o[0].replace(lt, " ")
                        }),
                        s = s.slice(i.length));
                    for (r in w.filter)
                        !(o = ht[r].exec(s)) || c[r] && !(o = c[r](o)) || (i = o.shift(),
                            a.push({
                                value: i,
                                type: r,
                                matches: o
                            }),
                            s = s.slice(i.length));
                    if (!i)
                        break
                }
                return n ? s.length : s ? t.error(e) : W(e, l).slice(0)
            }
            ,
            N = t.compile = function(e, t) {
                var n, i = [], o = [], a = X[e + " "];
                if (!a) {
                    for (t || (t = E(e)),
                             n = t.length; n--; )
                        a = y(t[n]),
                            a[B] ? i.push(a) : o.push(a);
                    a = X(e, b(o, i)),
                        a.selector = e
                }
                return a
            }
            ,
            S = t.select = function(e, t, n, i) {
                var o, a, r, s, l, c = "function" == typeof e && e, d = !i && E(e = c.selector || e);
                if (n = n || [],
                    1 === d.length) {
                    if (a = d[0] = d[0].slice(0),
                        a.length > 2 && "ID" === (r = a[0]).type && C.getById && 9 === t.nodeType && I && w.relative[a[1].type]) {
                        if (t = (w.find.ID(r.matches[0].replace(Ct, wt), t) || [])[0],
                                !t)
                            return n;
                        c && (t = t.parentNode),
                            e = e.slice(a.shift().value.length)
                    }
                    for (o = ht.needsContext.test(e) ? 0 : a.length; o-- && (r = a[o],
                        !w.relative[s = r.type]); )
                        if ((l = w.find[s]) && (i = l(r.matches[0].replace(Ct, wt), bt.test(a[0].type) && u(t.parentNode) || t))) {
                            if (a.splice(o, 1),
                                    e = i.length && f(a),
                                    !e)
                                return Z.apply(n, i),
                                    n;
                            break
                        }
                }
                return (c || N(e, d))(i, t, !I, n, bt.test(e) && u(t.parentNode) || t),
                    n
            }
            ,
            C.sortStable = B.split("").sort(U).join("") === B,
            C.detectDuplicates = !!D,
            M(),
            C.sortDetached = o(function(e) {
                return 1 & e.compareDocumentPosition(A.createElement("div"))
            }),
        o(function(e) {
            return e.innerHTML = "<a href='#'></a>",
            "#" === e.firstChild.getAttribute("href")
        }) || a("type|href|height|width", function(e, t, n) {
            return n ? void 0 : e.getAttribute(t, "type" === t.toLowerCase() ? 1 : 2)
        }),
        C.attributes && o(function(e) {
            return e.innerHTML = "<input/>",
                e.firstChild.setAttribute("value", ""),
            "" === e.firstChild.getAttribute("value")
        }) || a("value", function(e, t, n) {
            return n || "input" !== e.nodeName.toLowerCase() ? void 0 : e.defaultValue
        }),
        o(function(e) {
            return null == e.getAttribute("disabled")
        }) || a(nt, function(e, t, n) {
            var i;
            return n ? void 0 : e[t] === !0 ? t.toLowerCase() : (i = e.getAttributeNode(t)) && i.specified ? i.value : null
        }),
            t
    }(e);
    ot.find = ct,
        ot.expr = ct.selectors,
        ot.expr[":"] = ot.expr.pseudos,
        ot.unique = ct.uniqueSort,
        ot.text = ct.getText,
        ot.isXMLDoc = ct.isXML,
        ot.contains = ct.contains;
    var ut = ot.expr.match.needsContext
        , dt = /^<(\w+)\s*\/?>(?:<\/\1>|)$/
        , ft = /^.[^:#\[\.,]*$/;
    ot.filter = function(e, t, n) {
        var i = t[0];
        return n && (e = ":not(" + e + ")"),
            1 === t.length && 1 === i.nodeType ? ot.find.matchesSelector(i, e) ? [i] : [] : ot.find.matches(e, ot.grep(t, function(e) {
                return 1 === e.nodeType
            }))
    }
        ,
        ot.fn.extend({
            find: function(e) {
                var t, n = [], i = this, o = i.length;
                if ("string" != typeof e)
                    return this.pushStack(ot(e).filter(function() {
                        for (t = 0; o > t; t++)
                            if (ot.contains(i[t], this))
                                return !0
                    }));
                for (t = 0; o > t; t++)
                    ot.find(e, i[t], n);
                return n = this.pushStack(o > 1 ? ot.unique(n) : n),
                    n.selector = this.selector ? this.selector + " " + e : e,
                    n
            },
            filter: function(e) {
                return this.pushStack(i(this, e || [], !1))
            },
            not: function(e) {
                return this.pushStack(i(this, e || [], !0))
            },
            is: function(e) {
                return !!i(this, "string" == typeof e && ut.test(e) ? ot(e) : e || [], !1).length
            }
        });
    var pt, ht = e.document, mt = /^(?:\s*(<[\w\W]+>)[^>]*|#([\w-]*))$/, gt = ot.fn.init = function(e, t) {
            var n, i;
            if (!e)
                return this;
            if ("string" == typeof e) {
                if (n = "<" === e.charAt(0) && ">" === e.charAt(e.length - 1) && e.length >= 3 ? [null, e, null] : mt.exec(e),
                    !n || !n[1] && t)
                    return !t || t.jquery ? (t || pt).find(e) : this.constructor(t).find(e);
                if (n[1]) {
                    if (t = t instanceof ot ? t[0] : t,
                            ot.merge(this, ot.parseHTML(n[1], t && t.nodeType ? t.ownerDocument || t : ht, !0)),
                        dt.test(n[1]) && ot.isPlainObject(t))
                        for (n in t)
                            ot.isFunction(this[n]) ? this[n](t[n]) : this.attr(n, t[n]);
                    return this
                }
                if (i = ht.getElementById(n[2]),
                    i && i.parentNode) {
                    if (i.id !== n[2])
                        return pt.find(e);
                    this.length = 1,
                        this[0] = i
                }
                return this.context = ht,
                    this.selector = e,
                    this
            }
            return e.nodeType ? (this.context = this[0] = e,
                this.length = 1,
                this) : ot.isFunction(e) ? "undefined" != typeof pt.ready ? pt.ready(e) : e(ot) : (void 0 !== e.selector && (this.selector = e.selector,
                this.context = e.context),
                ot.makeArray(e, this))
        }
    ;
    gt.prototype = ot.fn,
        pt = ot(ht);
    var vt = /^(?:parents|prev(?:Until|All))/
        , yt = {
        children: !0,
        contents: !0,
        next: !0,
        prev: !0
    };
    ot.extend({
        dir: function(e, t, n) {
            for (var i = [], o = e[t]; o && 9 !== o.nodeType && (void 0 === n || 1 !== o.nodeType || !ot(o).is(n)); )
                1 === o.nodeType && i.push(o),
                    o = o[t];
            return i
        },
        sibling: function(e, t) {
            for (var n = []; e; e = e.nextSibling)
                1 === e.nodeType && e !== t && n.push(e);
            return n
        }
    }),
        ot.fn.extend({
            has: function(e) {
                var t, n = ot(e, this), i = n.length;
                return this.filter(function() {
                    for (t = 0; i > t; t++)
                        if (ot.contains(this, n[t]))
                            return !0
                })
            },
            closest: function(e, t) {
                for (var n, i = 0, o = this.length, a = [], r = ut.test(e) || "string" != typeof e ? ot(e, t || this.context) : 0; o > i; i++)
                    for (n = this[i]; n && n !== t; n = n.parentNode)
                        if (n.nodeType < 11 && (r ? r.index(n) > -1 : 1 === n.nodeType && ot.find.matchesSelector(n, e))) {
                            a.push(n);
                            break
                        }
                return this.pushStack(a.length > 1 ? ot.unique(a) : a)
            },
            index: function(e) {
                return e ? "string" == typeof e ? ot.inArray(this[0], ot(e)) : ot.inArray(e.jquery ? e[0] : e, this) : this[0] && this[0].parentNode ? this.first().prevAll().length : -1
            },
            add: function(e, t) {
                return this.pushStack(ot.unique(ot.merge(this.get(), ot(e, t))))
            },
            addBack: function(e) {
                return this.add(null == e ? this.prevObject : this.prevObject.filter(e))
            }
        }),
        ot.each({
            parent: function(e) {
                var t = e.parentNode;
                return t && 11 !== t.nodeType ? t : null
            },
            parents: function(e) {
                return ot.dir(e, "parentNode")
            },
            parentsUntil: function(e, t, n) {
                return ot.dir(e, "parentNode", n)
            },
            next: function(e) {
                return o(e, "nextSibling")
            },
            prev: function(e) {
                return o(e, "previousSibling")
            },
            nextAll: function(e) {
                return ot.dir(e, "nextSibling")
            },
            prevAll: function(e) {
                return ot.dir(e, "previousSibling")
            },
            nextUntil: function(e, t, n) {
                return ot.dir(e, "nextSibling", n)
            },
            prevUntil: function(e, t, n) {
                return ot.dir(e, "previousSibling", n)
            },
            siblings: function(e) {
                return ot.sibling((e.parentNode || {}).firstChild, e)
            },
            children: function(e) {
                return ot.sibling(e.firstChild)
            },
            contents: function(e) {
                return ot.nodeName(e, "iframe") ? e.contentDocument || e.contentWindow.document : ot.merge([], e.childNodes)
            }
        }, function(e, t) {
            ot.fn[e] = function(n, i) {
                var o = ot.map(this, t, n);
                return "Until" !== e.slice(-5) && (i = n),
                i && "string" == typeof i && (o = ot.filter(i, o)),
                this.length > 1 && (yt[e] || (o = ot.unique(o)),
                vt.test(e) && (o = o.reverse())),
                    this.pushStack(o)
            }
        });
    var bt = /\S+/g
        , xt = {};
    ot.Callbacks = function(e) {
        e = "string" == typeof e ? xt[e] || a(e) : ot.extend({}, e);
        var t, n, i, o, r, s, l = [], c = !e.once && [], u = function(a) {
            for (n = e.memory && a,
                     i = !0,
                     r = s || 0,
                     s = 0,
                     o = l.length,
                     t = !0; l && o > r; r++)
                if (l[r].apply(a[0], a[1]) === !1 && e.stopOnFalse) {
                    n = !1;
                    break
                }
            t = !1,
            l && (c ? c.length && u(c.shift()) : n ? l = [] : d.disable())
        }, d = {
            add: function() {
                if (l) {
                    var i = l.length;
                    !function a(t) {
                        ot.each(t, function(t, n) {
                            var i = ot.type(n);
                            "function" === i ? e.unique && d.has(n) || l.push(n) : n && n.length && "string" !== i && a(n)
                        })
                    }(arguments),
                        t ? o = l.length : n && (s = i,
                            u(n))
                }
                return this
            },
            remove: function() {
                return l && ot.each(arguments, function(e, n) {
                    for (var i; (i = ot.inArray(n, l, i)) > -1; )
                        l.splice(i, 1),
                        t && (o >= i && o--,
                        r >= i && r--)
                }),
                    this
            },
            has: function(e) {
                return e ? ot.inArray(e, l) > -1 : !(!l || !l.length)
            },
            empty: function() {
                return l = [],
                    o = 0,
                    this
            },
            disable: function() {
                return l = c = n = void 0,
                    this
            },
            disabled: function() {
                return !l
            },
            lock: function() {
                return c = void 0,
                n || d.disable(),
                    this
            },
            locked: function() {
                return !c
            },
            fireWith: function(e, n) {
                return !l || i && !c || (n = n || [],
                    n = [e, n.slice ? n.slice() : n],
                    t ? c.push(n) : u(n)),
                    this
            },
            fire: function() {
                return d.fireWith(this, arguments),
                    this
            },
            fired: function() {
                return !!i
            }
        };
        return d
    }
        ,
        ot.extend({
            Deferred: function(e) {
                var t = [["resolve", "done", ot.Callbacks("once memory"), "resolved"], ["reject", "fail", ot.Callbacks("once memory"), "rejected"], ["notify", "progress", ot.Callbacks("memory")]]
                    , n = "pending"
                    , i = {
                    state: function() {
                        return n
                    },
                    always: function() {
                        return o.done(arguments).fail(arguments),
                            this
                    },
                    then: function() {
                        var e = arguments;
                        return ot.Deferred(function(n) {
                            ot.each(t, function(t, a) {
                                var r = ot.isFunction(e[t]) && e[t];
                                o[a[1]](function() {
                                    var e = r && r.apply(this, arguments);
                                    e && ot.isFunction(e.promise) ? e.promise().done(n.resolve).fail(n.reject).progress(n.notify) : n[a[0] + "With"](this === i ? n.promise() : this, r ? [e] : arguments)
                                })
                            }),
                                e = null
                        }).promise()
                    },
                    promise: function(e) {
                        return null != e ? ot.extend(e, i) : i
                    }
                }
                    , o = {};
                return i.pipe = i.then,
                    ot.each(t, function(e, a) {
                        var r = a[2]
                            , s = a[3];
                        i[a[1]] = r.add,
                        s && r.add(function() {
                            n = s
                        }, t[1 ^ e][2].disable, t[2][2].lock),
                            o[a[0]] = function() {
                                return o[a[0] + "With"](this === o ? i : this, arguments),
                                    this
                            }
                            ,
                            o[a[0] + "With"] = r.fireWith
                    }),
                    i.promise(o),
                e && e.call(o, o),
                    o
            },
            when: function(e) {
                var t, n, i, o = 0, a = V.call(arguments), r = a.length, s = 1 !== r || e && ot.isFunction(e.promise) ? r : 0, l = 1 === s ? e : ot.Deferred(), c = function(e, n, i) {
                    return function(o) {
                        n[e] = this,
                            i[e] = arguments.length > 1 ? V.call(arguments) : o,
                            i === t ? l.notifyWith(n, i) : --s || l.resolveWith(n, i)
                    }
                };
                if (r > 1)
                    for (t = new Array(r),
                             n = new Array(r),
                             i = new Array(r); r > o; o++)
                        a[o] && ot.isFunction(a[o].promise) ? a[o].promise().done(c(o, i, a)).fail(l.reject).progress(c(o, n, t)) : --s;
                return s || l.resolveWith(i, a),
                    l.promise()
            }
        });
    var Ct;
    ot.fn.ready = function(e) {
        return ot.ready.promise().done(e),
            this
    }
        ,
        ot.extend({
            isReady: !1,
            readyWait: 1,
            holdReady: function(e) {
                e ? ot.readyWait++ : ot.ready(!0)
            },
            ready: function(e) {
                if (e === !0 ? !--ot.readyWait : !ot.isReady) {
                    if (!ht.body)
                        return setTimeout(ot.ready);
                    ot.isReady = !0,
                    e !== !0 && --ot.readyWait > 0 || (Ct.resolveWith(ht, [ot]),
                    ot.fn.triggerHandler && (ot(ht).triggerHandler("ready"),
                        ot(ht).off("ready")))
                }
            }
        }),
        ot.ready.promise = function(t) {
            if (!Ct)
                if (Ct = ot.Deferred(),
                    "complete" === ht.readyState)
                    setTimeout(ot.ready);
                else if (ht.addEventListener)
                    ht.addEventListener("DOMContentLoaded", s, !1),
                        e.addEventListener("load", s, !1);
                else {
                    ht.attachEvent("onreadystatechange", s),
                        e.attachEvent("onload", s);
                    var n = !1;
                    try {
                        n = null == e.frameElement && ht.documentElement
                    } catch (i) {}
                    n && n.doScroll && function o() {
                        if (!ot.isReady) {
                            try {
                                n.doScroll("left")
                            } catch (e) {
                                return setTimeout(o, 50)
                            }
                            r(),
                                ot.ready()
                        }
                    }()
                }
            return Ct.promise(t)
        }
    ;
    var wt, kt = "undefined";
    for (wt in ot(nt))
        break;
    nt.ownLast = "0" !== wt,
        nt.inlineBlockNeedsLayout = !1,
        ot(function() {
            var e, t, n, i;
            n = ht.getElementsByTagName("body")[0],
            n && n.style && (t = ht.createElement("div"),
                i = ht.createElement("div"),
                i.style.cssText = "position:absolute;border:0;width:0;height:0;top:0;left:-9999px",
                n.appendChild(i).appendChild(t),
            typeof t.style.zoom !== kt && (t.style.cssText = "display:inline;margin:0;border:0;padding:1px;width:1px;zoom:1",
                nt.inlineBlockNeedsLayout = e = 3 === t.offsetWidth,
            e && (n.style.zoom = 1)),
                n.removeChild(i))
        }),
        function() {
            var e = ht.createElement("div");
            if (null == nt.deleteExpando) {
                nt.deleteExpando = !0;
                try {
                    delete e.test
                } catch (t) {
                    nt.deleteExpando = !1
                }
            }
            e = null
        }(),
        ot.acceptData = function(e) {
            var t = ot.noData[(e.nodeName + " ").toLowerCase()]
                , n = +e.nodeType || 1;
            return 1 !== n && 9 !== n ? !1 : !t || t !== !0 && e.getAttribute("classid") === t
        }
    ;
    var Tt = /^(?:\{[\w\W]*\}|\[[\w\W]*\])$/
        , Et = /([A-Z])/g;
    ot.extend({
        cache: {},
        noData: {
            "applet ": !0,
            "embed ": !0,
            "object ": "clsid:D27CDB6E-AE6D-11cf-96B8-444553540000"
        },
        hasData: function(e) {
            return e = e.nodeType ? ot.cache[e[ot.expando]] : e[ot.expando],
            !!e && !c(e)
        },
        data: function(e, t, n) {
            return u(e, t, n)
        },
        removeData: function(e, t) {
            return d(e, t)
        },
        _data: function(e, t, n) {
            return u(e, t, n, !0)
        },
        _removeData: function(e, t) {
            return d(e, t, !0)
        }
    }),
        ot.fn.extend({
            data: function(e, t) {
                var n, i, o, a = this[0], r = a && a.attributes;
                if (void 0 === e) {
                    if (this.length && (o = ot.data(a),
                        1 === a.nodeType && !ot._data(a, "parsedAttrs"))) {
                        for (n = r.length; n--; )
                            r[n] && (i = r[n].name,
                            0 === i.indexOf("data-") && (i = ot.camelCase(i.slice(5)),
                                l(a, i, o[i])));
                        ot._data(a, "parsedAttrs", !0)
                    }
                    return o
                }
                return "object" == typeof e ? this.each(function() {
                    ot.data(this, e)
                }) : arguments.length > 1 ? this.each(function() {
                    ot.data(this, e, t)
                }) : a ? l(a, e, ot.data(a, e)) : void 0
            },
            removeData: function(e) {
                return this.each(function() {
                    ot.removeData(this, e)
                })
            }
        }),
        ot.extend({
            queue: function(e, t, n) {
                var i;
                return e ? (t = (t || "fx") + "queue",
                    i = ot._data(e, t),
                n && (!i || ot.isArray(n) ? i = ot._data(e, t, ot.makeArray(n)) : i.push(n)),
                i || []) : void 0
            },
            dequeue: function(e, t) {
                t = t || "fx";
                var n = ot.queue(e, t)
                    , i = n.length
                    , o = n.shift()
                    , a = ot._queueHooks(e, t)
                    , r = function() {
                    ot.dequeue(e, t)
                };
                "inprogress" === o && (o = n.shift(),
                    i--),
                o && ("fx" === t && n.unshift("inprogress"),
                    delete a.stop,
                    o.call(e, r, a)),
                !i && a && a.empty.fire()
            },
            _queueHooks: function(e, t) {
                var n = t + "queueHooks";
                return ot._data(e, n) || ot._data(e, n, {
                    empty: ot.Callbacks("once memory").add(function() {
                        ot._removeData(e, t + "queue"),
                            ot._removeData(e, n)
                    })
                })
            }
        }),
        ot.fn.extend({
            queue: function(e, t) {
                var n = 2;
                return "string" != typeof e && (t = e,
                    e = "fx",
                    n--),
                    arguments.length < n ? ot.queue(this[0], e) : void 0 === t ? this : this.each(function() {
                        var n = ot.queue(this, e, t);
                        ot._queueHooks(this, e),
                        "fx" === e && "inprogress" !== n[0] && ot.dequeue(this, e)
                    })
            },
            dequeue: function(e) {
                return this.each(function() {
                    ot.dequeue(this, e)
                })
            },
            clearQueue: function(e) {
                return this.queue(e || "fx", [])
            },
            promise: function(e, t) {
                var n, i = 1, o = ot.Deferred(), a = this, r = this.length, s = function() {
                    --i || o.resolveWith(a, [a])
                };
                for ("string" != typeof e && (t = e,
                    e = void 0),
                         e = e || "fx"; r--; )
                    n = ot._data(a[r], e + "queueHooks"),
                    n && n.empty && (i++,
                        n.empty.add(s));
                return s(),
                    o.promise(t)
            }
        });
    var Nt = /[+-]?(?:\d*\.|)\d+(?:[eE][+-]?\d+|)/.source
        , St = ["Top", "Right", "Bottom", "Left"]
        , Lt = function(e, t) {
        return e = t || e,
        "none" === ot.css(e, "display") || !ot.contains(e.ownerDocument, e)
    }
        , $t = ot.access = function(e, t, n, i, o, a, r) {
        var s = 0
            , l = e.length
            , c = null == n;
        if ("object" === ot.type(n)) {
            o = !0;
            for (s in n)
                ot.access(e, t, s, n[s], !0, a, r)
        } else if (void 0 !== i && (o = !0,
            ot.isFunction(i) || (r = !0),
            c && (r ? (t.call(e, i),
                t = null) : (c = t,
                    t = function(e, t, n) {
                        return c.call(ot(e), n)
                    }
            )),
                t))
            for (; l > s; s++)
                t(e[s], n, r ? i : i.call(e[s], s, t(e[s], n)));
        return o ? e : c ? t.call(e) : l ? t(e[0], n) : a
    }
        , Dt = /^(?:checkbox|radio)$/i;
    !function() {
        var e = ht.createElement("input")
            , t = ht.createElement("div")
            , n = ht.createDocumentFragment();
        if (t.innerHTML = "  <link/><table></table><a href='/a'>a</a><input type='checkbox'/>",
                nt.leadingWhitespace = 3 === t.firstChild.nodeType,
                nt.tbody = !t.getElementsByTagName("tbody").length,
                nt.htmlSerialize = !!t.getElementsByTagName("link").length,
                nt.html5Clone = "<:nav></:nav>" !== ht.createElement("nav").cloneNode(!0).outerHTML,
                e.type = "checkbox",
                e.checked = !0,
                n.appendChild(e),
                nt.appendChecked = e.checked,
                t.innerHTML = "<textarea>x</textarea>",
                nt.noCloneChecked = !!t.cloneNode(!0).lastChild.defaultValue,
                n.appendChild(t),
                t.innerHTML = "<input type='radio' checked='checked' name='t'/>",
                nt.checkClone = t.cloneNode(!0).cloneNode(!0).lastChild.checked,
                nt.noCloneEvent = !0,
            t.attachEvent && (t.attachEvent("onclick", function() {
                nt.noCloneEvent = !1
            }),
                t.cloneNode(!0).click()),
            null == nt.deleteExpando) {
            nt.deleteExpando = !0;
            try {
                delete t.test
            } catch (i) {
                nt.deleteExpando = !1
            }
        }
    }(),
        function() {
            var t, n, i = ht.createElement("div");
            for (t in {
                submit: !0,
                change: !0,
                focusin: !0
            })
                n = "on" + t,
                (nt[t + "Bubbles"] = n in e) || (i.setAttribute(n, "t"),
                    nt[t + "Bubbles"] = i.attributes[n].expando === !1);
            i = null
        }();
    var Mt = /^(?:input|select|textarea)$/i
        , At = /^key/
        , jt = /^(?:mouse|pointer|contextmenu)|click/
        , It = /^(?:focusinfocus|focusoutblur)$/
        , Ot = /^([^.]*)(?:\.(.+)|)$/;
    ot.event = {
        global: {},
        add: function(e, t, n, i, o) {
            var a, r, s, l, c, u, d, f, p, h, m, g = ot._data(e);
            if (g) {
                for (n.handler && (l = n,
                    n = l.handler,
                    o = l.selector),
                     n.guid || (n.guid = ot.guid++),
                     (r = g.events) || (r = g.events = {}),
                     (u = g.handle) || (u = g.handle = function(e) {
                         return typeof ot === kt || e && ot.event.triggered === e.type ? void 0 : ot.event.dispatch.apply(u.elem, arguments)
                     }
                         ,
                         u.elem = e),
                         t = (t || "").match(bt) || [""],
                         s = t.length; s--; )
                    a = Ot.exec(t[s]) || [],
                        p = m = a[1],
                        h = (a[2] || "").split(".").sort(),
                    p && (c = ot.event.special[p] || {},
                        p = (o ? c.delegateType : c.bindType) || p,
                        c = ot.event.special[p] || {},
                        d = ot.extend({
                            type: p,
                            origType: m,
                            data: i,
                            handler: n,
                            guid: n.guid,
                            selector: o,
                            needsContext: o && ot.expr.match.needsContext.test(o),
                            namespace: h.join(".")
                        }, l),
                    (f = r[p]) || (f = r[p] = [],
                        f.delegateCount = 0,
                    c.setup && c.setup.call(e, i, h, u) !== !1 || (e.addEventListener ? e.addEventListener(p, u, !1) : e.attachEvent && e.attachEvent("on" + p, u))),
                    c.add && (c.add.call(e, d),
                    d.handler.guid || (d.handler.guid = n.guid)),
                        o ? f.splice(f.delegateCount++, 0, d) : f.push(d),
                        ot.event.global[p] = !0);
                e = null
            }
        },
        remove: function(e, t, n, i, o) {
            var a, r, s, l, c, u, d, f, p, h, m, g = ot.hasData(e) && ot._data(e);
            if (g && (u = g.events)) {
                for (t = (t || "").match(bt) || [""],
                         c = t.length; c--; )
                    if (s = Ot.exec(t[c]) || [],
                            p = m = s[1],
                            h = (s[2] || "").split(".").sort(),
                            p) {
                        for (d = ot.event.special[p] || {},
                                 p = (i ? d.delegateType : d.bindType) || p,
                                 f = u[p] || [],
                                 s = s[2] && new RegExp("(^|\\.)" + h.join("\\.(?:.*\\.|)") + "(\\.|$)"),
                                 l = a = f.length; a--; )
                            r = f[a],
                            !o && m !== r.origType || n && n.guid !== r.guid || s && !s.test(r.namespace) || i && i !== r.selector && ("**" !== i || !r.selector) || (f.splice(a, 1),
                            r.selector && f.delegateCount--,
                            d.remove && d.remove.call(e, r));
                        l && !f.length && (d.teardown && d.teardown.call(e, h, g.handle) !== !1 || ot.removeEvent(e, p, g.handle),
                            delete u[p])
                    } else
                        for (p in u)
                            ot.event.remove(e, p + t[c], n, i, !0);
                ot.isEmptyObject(u) && (delete g.handle,
                    ot._removeData(e, "events"))
            }
        },
        trigger: function(t, n, i, o) {
            var a, r, s, l, c, u, d, f = [i || ht], p = tt.call(t, "type") ? t.type : t, h = tt.call(t, "namespace") ? t.namespace.split(".") : [];
            if (s = u = i = i || ht,
                3 !== i.nodeType && 8 !== i.nodeType && !It.test(p + ot.event.triggered) && (p.indexOf(".") >= 0 && (h = p.split("."),
                    p = h.shift(),
                    h.sort()),
                    r = p.indexOf(":") < 0 && "on" + p,
                    t = t[ot.expando] ? t : new ot.Event(p,"object" == typeof t && t),
                    t.isTrigger = o ? 2 : 3,
                    t.namespace = h.join("."),
                    t.namespace_re = t.namespace ? new RegExp("(^|\\.)" + h.join("\\.(?:.*\\.|)") + "(\\.|$)") : null,
                    t.result = void 0,
                t.target || (t.target = i),
                    n = null == n ? [t] : ot.makeArray(n, [t]),
                    c = ot.event.special[p] || {},
                o || !c.trigger || c.trigger.apply(i, n) !== !1)) {
                if (!o && !c.noBubble && !ot.isWindow(i)) {
                    for (l = c.delegateType || p,
                         It.test(l + p) || (s = s.parentNode); s; s = s.parentNode)
                        f.push(s),
                            u = s;
                    u === (i.ownerDocument || ht) && f.push(u.defaultView || u.parentWindow || e)
                }
                for (d = 0; (s = f[d++]) && !t.isPropagationStopped(); )
                    t.type = d > 1 ? l : c.bindType || p,
                        a = (ot._data(s, "events") || {})[t.type] && ot._data(s, "handle"),
                    a && a.apply(s, n),
                        a = r && s[r],
                    a && a.apply && ot.acceptData(s) && (t.result = a.apply(s, n),
                    t.result === !1 && t.preventDefault());
                if (t.type = p,
                    !o && !t.isDefaultPrevented() && (!c._default || c._default.apply(f.pop(), n) === !1) && ot.acceptData(i) && r && i[p] && !ot.isWindow(i)) {
                    u = i[r],
                    u && (i[r] = null),
                        ot.event.triggered = p;
                    try {
                        i[p]()
                    } catch (m) {}
                    ot.event.triggered = void 0,
                    u && (i[r] = u)
                }
                return t.result
            }
        },
        dispatch: function(e) {
            e = ot.event.fix(e);
            var t, n, i, o, a, r = [], s = V.call(arguments), l = (ot._data(this, "events") || {})[e.type] || [], c = ot.event.special[e.type] || {};
            if (s[0] = e,
                    e.delegateTarget = this,
                !c.preDispatch || c.preDispatch.call(this, e) !== !1) {
                for (r = ot.event.handlers.call(this, e, l),
                         t = 0; (o = r[t++]) && !e.isPropagationStopped(); )
                    for (e.currentTarget = o.elem,
                             a = 0; (i = o.handlers[a++]) && !e.isImmediatePropagationStopped(); )
                        (!e.namespace_re || e.namespace_re.test(i.namespace)) && (e.handleObj = i,
                            e.data = i.data,
                            n = ((ot.event.special[i.origType] || {}).handle || i.handler).apply(o.elem, s),
                        void 0 !== n && (e.result = n) === !1 && (e.preventDefault(),
                            e.stopPropagation()));
                return c.postDispatch && c.postDispatch.call(this, e),
                    e.result
            }
        },
        handlers: function(e, t) {
            var n, i, o, a, r = [], s = t.delegateCount, l = e.target;
            if (s && l.nodeType && (!e.button || "click" !== e.type))
                for (; l != this; l = l.parentNode || this)
                    if (1 === l.nodeType && (l.disabled !== !0 || "click" !== e.type)) {
                        for (o = [],
                                 a = 0; s > a; a++)
                            i = t[a],
                                n = i.selector + " ",
                            void 0 === o[n] && (o[n] = i.needsContext ? ot(n, this).index(l) >= 0 : ot.find(n, this, null, [l]).length),
                            o[n] && o.push(i);
                        o.length && r.push({
                            elem: l,
                            handlers: o
                        })
                    }
            return s < t.length && r.push({
                elem: this,
                handlers: t.slice(s)
            }),
                r
        },
        fix: function(e) {
            if (e[ot.expando])
                return e;
            var t, n, i, o = e.type, a = e, r = this.fixHooks[o];
            for (r || (this.fixHooks[o] = r = jt.test(o) ? this.mouseHooks : At.test(o) ? this.keyHooks : {}),
                     i = r.props ? this.props.concat(r.props) : this.props,
                     e = new ot.Event(a),
                     t = i.length; t--; )
                n = i[t],
                    e[n] = a[n];
            return e.target || (e.target = a.srcElement || ht),
            3 === e.target.nodeType && (e.target = e.target.parentNode),
                e.metaKey = !!e.metaKey,
                r.filter ? r.filter(e, a) : e
        },
        props: "altKey bubbles cancelable ctrlKey currentTarget eventPhase metaKey relatedTarget shiftKey target timeStamp view which".split(" "),
        fixHooks: {},
        keyHooks: {
            props: "char charCode key keyCode".split(" "),
            filter: function(e, t) {
                return null == e.which && (e.which = null != t.charCode ? t.charCode : t.keyCode),
                    e
            }
        },
        mouseHooks: {
            props: "button buttons clientX clientY fromElement offsetX offsetY pageX pageY screenX screenY toElement".split(" "),
            filter: function(e, t) {
                var n, i, o, a = t.button, r = t.fromElement;
                return null == e.pageX && null != t.clientX && (i = e.target.ownerDocument || ht,
                    o = i.documentElement,
                    n = i.body,
                    e.pageX = t.clientX + (o && o.scrollLeft || n && n.scrollLeft || 0) - (o && o.clientLeft || n && n.clientLeft || 0),
                    e.pageY = t.clientY + (o && o.scrollTop || n && n.scrollTop || 0) - (o && o.clientTop || n && n.clientTop || 0)),
                !e.relatedTarget && r && (e.relatedTarget = r === e.target ? t.toElement : r),
                e.which || void 0 === a || (e.which = 1 & a ? 1 : 2 & a ? 3 : 4 & a ? 2 : 0),
                    e
            }
        },
        special: {
            load: {
                noBubble: !0
            },
            focus: {
                trigger: function() {
                    if (this !== h() && this.focus)
                        try {
                            return this.focus(),
                                !1
                        } catch (e) {}
                },
                delegateType: "focusin"
            },
            blur: {
                trigger: function() {
                    return this === h() && this.blur ? (this.blur(),
                        !1) : void 0
                },
                delegateType: "focusout"
            },
            click: {
                trigger: function() {
                    return ot.nodeName(this, "input") && "checkbox" === this.type && this.click ? (this.click(),
                        !1) : void 0
                },
                _default: function(e) {
                    return ot.nodeName(e.target, "a")
                }
            },
            beforeunload: {
                postDispatch: function(e) {
                    void 0 !== e.result && e.originalEvent && (e.originalEvent.returnValue = e.result)
                }
            }
        },
        simulate: function(e, t, n, i) {
            var o = ot.extend(new ot.Event, n, {
                type: e,
                isSimulated: !0,
                originalEvent: {}
            });
            i ? ot.event.trigger(o, null, t) : ot.event.dispatch.call(t, o),
            o.isDefaultPrevented() && n.preventDefault()
        }
    },
        ot.removeEvent = ht.removeEventListener ? function(e, t, n) {
                e.removeEventListener && e.removeEventListener(t, n, !1)
            }
            : function(e, t, n) {
                var i = "on" + t;
                e.detachEvent && (typeof e[i] === kt && (e[i] = null),
                    e.detachEvent(i, n))
            }
        ,
        ot.Event = function(e, t) {
            return this instanceof ot.Event ? (e && e.type ? (this.originalEvent = e,
                this.type = e.type,
                this.isDefaultPrevented = e.defaultPrevented || void 0 === e.defaultPrevented && e.returnValue === !1 ? f : p) : this.type = e,
            t && ot.extend(this, t),
                this.timeStamp = e && e.timeStamp || ot.now(),
                this[ot.expando] = !0,
                void 0) : new ot.Event(e,t)
        }
        ,
        ot.Event.prototype = {
            isDefaultPrevented: p,
            isPropagationStopped: p,
            isImmediatePropagationStopped: p,
            preventDefault: function() {
                var e = this.originalEvent;
                this.isDefaultPrevented = f,
                e && (e.preventDefault ? e.preventDefault() : e.returnValue = !1)
            },
            stopPropagation: function() {
                var e = this.originalEvent;
                this.isPropagationStopped = f,
                e && (e.stopPropagation && e.stopPropagation(),
                    e.cancelBubble = !0)
            },
            stopImmediatePropagation: function() {
                var e = this.originalEvent;
                this.isImmediatePropagationStopped = f,
                e && e.stopImmediatePropagation && e.stopImmediatePropagation(),
                    this.stopPropagation()
            }
        },
        ot.each({
            mouseenter: "mouseover",
            mouseleave: "mouseout",
            pointerenter: "pointerover",
            pointerleave: "pointerout"
        }, function(e, t) {
            ot.event.special[e] = {
                delegateType: t,
                bindType: t,
                handle: function(e) {
                    var n, i = this, o = e.relatedTarget, a = e.handleObj;
                    return (!o || o !== i && !ot.contains(i, o)) && (e.type = a.origType,
                        n = a.handler.apply(this, arguments),
                        e.type = t),
                        n
                }
            }
        }),
    nt.submitBubbles || (ot.event.special.submit = {
        setup: function() {
            return ot.nodeName(this, "form") ? !1 : (ot.event.add(this, "click._submit keypress._submit", function(e) {
                var t = e.target
                    , n = ot.nodeName(t, "input") || ot.nodeName(t, "button") ? t.form : void 0;
                n && !ot._data(n, "submitBubbles") && (ot.event.add(n, "submit._submit", function(e) {
                    e._submit_bubble = !0
                }),
                    ot._data(n, "submitBubbles", !0))
            }),
                void 0)
        },
        postDispatch: function(e) {
            e._submit_bubble && (delete e._submit_bubble,
            this.parentNode && !e.isTrigger && ot.event.simulate("submit", this.parentNode, e, !0))
        },
        teardown: function() {
            return ot.nodeName(this, "form") ? !1 : (ot.event.remove(this, "._submit"),
                void 0)
        }
    }),
    nt.changeBubbles || (ot.event.special.change = {
        setup: function() {
            return Mt.test(this.nodeName) ? (("checkbox" === this.type || "radio" === this.type) && (ot.event.add(this, "propertychange._change", function(e) {
                "checked" === e.originalEvent.propertyName && (this._just_changed = !0)
            }),
                ot.event.add(this, "click._change", function(e) {
                    this._just_changed && !e.isTrigger && (this._just_changed = !1),
                        ot.event.simulate("change", this, e, !0)
                })),
                !1) : (ot.event.add(this, "beforeactivate._change", function(e) {
                var t = e.target;
                Mt.test(t.nodeName) && !ot._data(t, "changeBubbles") && (ot.event.add(t, "change._change", function(e) {
                    !this.parentNode || e.isSimulated || e.isTrigger || ot.event.simulate("change", this.parentNode, e, !0)
                }),
                    ot._data(t, "changeBubbles", !0))
            }),
                void 0)
        },
        handle: function(e) {
            var t = e.target;
            return this !== t || e.isSimulated || e.isTrigger || "radio" !== t.type && "checkbox" !== t.type ? e.handleObj.handler.apply(this, arguments) : void 0
        },
        teardown: function() {
            return ot.event.remove(this, "._change"),
                !Mt.test(this.nodeName)
        }
    }),
    nt.focusinBubbles || ot.each({
        focus: "focusin",
        blur: "focusout"
    }, function(e, t) {
        var n = function(e) {
            ot.event.simulate(t, e.target, ot.event.fix(e), !0)
        };
        ot.event.special[t] = {
            setup: function() {
                var i = this.ownerDocument || this
                    , o = ot._data(i, t);
                o || i.addEventListener(e, n, !0),
                    ot._data(i, t, (o || 0) + 1)
            },
            teardown: function() {
                var i = this.ownerDocument || this
                    , o = ot._data(i, t) - 1;
                o ? ot._data(i, t, o) : (i.removeEventListener(e, n, !0),
                    ot._removeData(i, t))
            }
        }
    }),
        ot.fn.extend({
            on: function(e, t, n, i, o) {
                var a, r;
                if ("object" == typeof e) {
                    "string" != typeof t && (n = n || t,
                        t = void 0);
                    for (a in e)
                        this.on(a, t, n, e[a], o);
                    return this
                }
                if (null == n && null == i ? (i = t,
                        n = t = void 0) : null == i && ("string" == typeof t ? (i = n,
                        n = void 0) : (i = n,
                        n = t,
                        t = void 0)),
                    i === !1)
                    i = p;
                else if (!i)
                    return this;
                return 1 === o && (r = i,
                    i = function(e) {
                        return ot().off(e),
                            r.apply(this, arguments)
                    }
                    ,
                    i.guid = r.guid || (r.guid = ot.guid++)),
                    this.each(function() {
                        ot.event.add(this, e, i, n, t)
                    })
            },
            one: function(e, t, n, i) {
                return this.on(e, t, n, i, 1)
            },
            off: function(e, t, n) {
                var i, o;
                if (e && e.preventDefault && e.handleObj)
                    return i = e.handleObj,
                        ot(e.delegateTarget).off(i.namespace ? i.origType + "." + i.namespace : i.origType, i.selector, i.handler),
                        this;
                if ("object" == typeof e) {
                    for (o in e)
                        this.off(o, t, e[o]);
                    return this
                }
                return (t === !1 || "function" == typeof t) && (n = t,
                    t = void 0),
                n === !1 && (n = p),
                    this.each(function() {
                        ot.event.remove(this, e, n, t)
                    })
            },
            trigger: function(e, t) {
                return this.each(function() {
                    ot.event.trigger(e, t, this)
                })
            },
            triggerHandler: function(e, t) {
                var n = this[0];
                return n ? ot.event.trigger(e, t, n, !0) : void 0
            }
        });
    var Ht = "abbr|article|aside|audio|bdi|canvas|data|datalist|details|figcaption|figure|footer|header|hgroup|mark|meter|nav|output|progress|section|summary|time|video"
        , Pt = / jQuery\d+="(?:null|\d+)"/g
        , Ft = new RegExp("<(?:" + Ht + ")[\\s/>]","i")
        , Bt = /^\s+/
        , _t = /<(?!area|br|col|embed|hr|img|input|link|meta|param)(([\w:]+)[^>]*)\/>/gi
        , qt = /<([\w:]+)/
        , zt = /<tbody/i
        , Rt = /<|&#?\w+;/
        , Wt = /<(?:script|style|link)/i
        , Xt = /checked\s*(?:[^=]|=\s*.checked.)/i
        , Ut = /^$|\/(?:java|ecma)script/i
        , Yt = /^true\/(.*)/
        , Gt = /^\s*<!(?:\[CDATA\[|--)|(?:\]\]|--)>\s*$/g
        , Vt = {
        option: [1, "<select multiple='multiple'>", "</select>"],
        legend: [1, "<fieldset>", "</fieldset>"],
        area: [1, "<map>", "</map>"],
        param: [1, "<object>", "</object>"],
        thead: [1, "<table>", "</table>"],
        tr: [2, "<table><tbody>", "</tbody></table>"],
        col: [2, "<table><tbody></tbody><colgroup>", "</colgroup></table>"],
        td: [3, "<table><tbody><tr>", "</tr></tbody></table>"],
        _default: nt.htmlSerialize ? [0, "", ""] : [1, "X<div>", "</div>"]
    }
        , Qt = m(ht)
        , Jt = Qt.appendChild(ht.createElement("div"));
    Vt.optgroup = Vt.option,
        Vt.tbody = Vt.tfoot = Vt.colgroup = Vt.caption = Vt.thead,
        Vt.th = Vt.td,
        ot.extend({
            clone: function(e, t, n) {
                var i, o, a, r, s, l = ot.contains(e.ownerDocument, e);
                if (nt.html5Clone || ot.isXMLDoc(e) || !Ft.test("<" + e.nodeName + ">") ? a = e.cloneNode(!0) : (Jt.innerHTML = e.outerHTML,
                        Jt.removeChild(a = Jt.firstChild)),
                        !(nt.noCloneEvent && nt.noCloneChecked || 1 !== e.nodeType && 11 !== e.nodeType || ot.isXMLDoc(e)))
                    for (i = g(a),
                             s = g(e),
                             r = 0; null != (o = s[r]); ++r)
                        i[r] && k(o, i[r]);
                if (t)
                    if (n)
                        for (s = s || g(e),
                                 i = i || g(a),
                                 r = 0; null != (o = s[r]); r++)
                            w(o, i[r]);
                    else
                        w(e, a);
                return i = g(a, "script"),
                i.length > 0 && C(i, !l && g(e, "script")),
                    i = s = o = null,
                    a
            },
            buildFragment: function(e, t, n, i) {
                for (var o, a, r, s, l, c, u, d = e.length, f = m(t), p = [], h = 0; d > h; h++)
                    if (a = e[h],
                        a || 0 === a)
                        if ("object" === ot.type(a))
                            ot.merge(p, a.nodeType ? [a] : a);
                        else if (Rt.test(a)) {
                            for (s = s || f.appendChild(t.createElement("div")),
                                     l = (qt.exec(a) || ["", ""])[1].toLowerCase(),
                                     u = Vt[l] || Vt._default,
                                     s.innerHTML = u[1] + a.replace(_t, "<$1></$2>") + u[2],
                                     o = u[0]; o--; )
                                s = s.lastChild;
                            if (!nt.leadingWhitespace && Bt.test(a) && p.push(t.createTextNode(Bt.exec(a)[0])),
                                    !nt.tbody)
                                for (a = "table" !== l || zt.test(a) ? "<table>" !== u[1] || zt.test(a) ? 0 : s : s.firstChild,
                                         o = a && a.childNodes.length; o--; )
                                    ot.nodeName(c = a.childNodes[o], "tbody") && !c.childNodes.length && a.removeChild(c);
                            for (ot.merge(p, s.childNodes),
                                     s.textContent = ""; s.firstChild; )
                                s.removeChild(s.firstChild);
                            s = f.lastChild
                        } else
                            p.push(t.createTextNode(a));
                for (s && f.removeChild(s),
                     nt.appendChecked || ot.grep(g(p, "input"), v),
                         h = 0; a = p[h++]; )
                    if ((!i || -1 === ot.inArray(a, i)) && (r = ot.contains(a.ownerDocument, a),
                            s = g(f.appendChild(a), "script"),
                        r && C(s),
                            n))
                        for (o = 0; a = s[o++]; )
                            Ut.test(a.type || "") && n.push(a);
                return s = null,
                    f
            },
            cleanData: function(e, t) {
                for (var n, i, o, a, r = 0, s = ot.expando, l = ot.cache, c = nt.deleteExpando, u = ot.event.special; null != (n = e[r]); r++)
                    if ((t || ot.acceptData(n)) && (o = n[s],
                            a = o && l[o])) {
                        if (a.events)
                            for (i in a.events)
                                u[i] ? ot.event.remove(n, i) : ot.removeEvent(n, i, a.handle);
                        l[o] && (delete l[o],
                            c ? delete n[s] : typeof n.removeAttribute !== kt ? n.removeAttribute(s) : n[s] = null,
                            G.push(o))
                    }
            }
        }),
        ot.fn.extend({
            text: function(e) {
                return $t(this, function(e) {
                    return void 0 === e ? ot.text(this) : this.empty().append((this[0] && this[0].ownerDocument || ht).createTextNode(e))
                }, null, e, arguments.length)
            },
            append: function() {
                return this.domManip(arguments, function(e) {
                    if (1 === this.nodeType || 11 === this.nodeType || 9 === this.nodeType) {
                        var t = y(this, e);
                        t.appendChild(e)
                    }
                })
            },
            prepend: function() {
                return this.domManip(arguments, function(e) {
                    if (1 === this.nodeType || 11 === this.nodeType || 9 === this.nodeType) {
                        var t = y(this, e);
                        t.insertBefore(e, t.firstChild)
                    }
                })
            },
            before: function() {
                return this.domManip(arguments, function(e) {
                    this.parentNode && this.parentNode.insertBefore(e, this)
                })
            },
            after: function() {
                return this.domManip(arguments, function(e) {
                    this.parentNode && this.parentNode.insertBefore(e, this.nextSibling)
                })
            },
            remove: function(e, t) {
                for (var n, i = e ? ot.filter(e, this) : this, o = 0; null != (n = i[o]); o++)
                    t || 1 !== n.nodeType || ot.cleanData(g(n)),
                    n.parentNode && (t && ot.contains(n.ownerDocument, n) && C(g(n, "script")),
                        n.parentNode.removeChild(n));
                return this
            },
            empty: function() {
                for (var e, t = 0; null != (e = this[t]); t++) {
                    for (1 === e.nodeType && ot.cleanData(g(e, !1)); e.firstChild; )
                        e.removeChild(e.firstChild);
                    e.options && ot.nodeName(e, "select") && (e.options.length = 0)
                }
                return this
            },
            clone: function(e, t) {
                return e = null == e ? !1 : e,
                    t = null == t ? e : t,
                    this.map(function() {
                        return ot.clone(this, e, t)
                    })
            },
            html: function(e) {
                return $t(this, function(e) {
                    var t = this[0] || {}
                        , n = 0
                        , i = this.length;
                    if (void 0 === e)
                        return 1 === t.nodeType ? t.innerHTML.replace(Pt, "") : void 0;
                    if (!("string" != typeof e || Wt.test(e) || !nt.htmlSerialize && Ft.test(e) || !nt.leadingWhitespace && Bt.test(e) || Vt[(qt.exec(e) || ["", ""])[1].toLowerCase()])) {
                        e = e.replace(_t, "<$1></$2>");
                        try {
                            for (; i > n; n++)
                                t = this[n] || {},
                                1 === t.nodeType && (ot.cleanData(g(t, !1)),
                                    t.innerHTML = e);
                            t = 0
                        } catch (o) {}
                    }
                    t && this.empty().append(e)
                }, null, e, arguments.length)
            },
            replaceWith: function() {
                var e = arguments[0];
                return this.domManip(arguments, function(t) {
                    e = this.parentNode,
                        ot.cleanData(g(this)),
                    e && e.replaceChild(t, this)
                }),
                    e && (e.length || e.nodeType) ? this : this.remove()
            },
            detach: function(e) {
                return this.remove(e, !0)
            },
            domManip: function(e, t) {
                e = Q.apply([], e);
                var n, i, o, a, r, s, l = 0, c = this.length, u = this, d = c - 1, f = e[0], p = ot.isFunction(f);
                if (p || c > 1 && "string" == typeof f && !nt.checkClone && Xt.test(f))
                    return this.each(function(n) {
                        var i = u.eq(n);
                        p && (e[0] = f.call(this, n, i.html())),
                            i.domManip(e, t)
                    });
                if (c && (s = ot.buildFragment(e, this[0].ownerDocument, !1, this),
                        n = s.firstChild,
                    1 === s.childNodes.length && (s = n),
                        n)) {
                    for (a = ot.map(g(s, "script"), b),
                             o = a.length; c > l; l++)
                        i = s,
                        l !== d && (i = ot.clone(i, !0, !0),
                        o && ot.merge(a, g(i, "script"))),
                            t.call(this[l], i, l);
                    if (o)
                        for (r = a[a.length - 1].ownerDocument,
                                 ot.map(a, x),
                                 l = 0; o > l; l++)
                            i = a[l],
                            Ut.test(i.type || "") && !ot._data(i, "globalEval") && ot.contains(r, i) && (i.src ? ot._evalUrl && ot._evalUrl(i.src) : ot.globalEval((i.text || i.textContent || i.innerHTML || "").replace(Gt, "")));
                    s = n = null
                }
                return this
            }
        }),
        ot.each({
            appendTo: "append",
            prependTo: "prepend",
            insertBefore: "before",
            insertAfter: "after",
            replaceAll: "replaceWith"
        }, function(e, t) {
            ot.fn[e] = function(e) {
                for (var n, i = 0, o = [], a = ot(e), r = a.length - 1; r >= i; i++)
                    n = i === r ? this : this.clone(!0),
                        ot(a[i])[t](n),
                        J.apply(o, n.get());
                return this.pushStack(o)
            }
        });
    var Kt, Zt = {};
    !function() {
        var e;
        nt.shrinkWrapBlocks = function() {
            if (null != e)
                return e;
            e = !1;
            var t, n, i;
            return n = ht.getElementsByTagName("body")[0],
                n && n.style ? (t = ht.createElement("div"),
                    i = ht.createElement("div"),
                    i.style.cssText = "position:absolute;border:0;width:0;height:0;top:0;left:-9999px",
                    n.appendChild(i).appendChild(t),
                typeof t.style.zoom !== kt && (t.style.cssText = "-webkit-box-sizing:content-box;-moz-box-sizing:content-box;box-sizing:content-box;display:block;margin:0;border:0;padding:1px;width:1px;zoom:1",
                    t.appendChild(ht.createElement("div")).style.width = "5px",
                    e = 3 !== t.offsetWidth),
                    n.removeChild(i),
                    e) : void 0
        }
    }();
    var en, tn, nn = /^margin/, on = new RegExp("^(" + Nt + ")(?!px)[a-z%]+$","i"), an = /^(top|right|bottom|left)$/;
    e.getComputedStyle ? (en = function(e) {
            return e.ownerDocument.defaultView.getComputedStyle(e, null)
        }
            ,
            tn = function(e, t, n) {
                var i, o, a, r, s = e.style;
                return n = n || en(e),
                    r = n ? n.getPropertyValue(t) || n[t] : void 0,
                n && ("" !== r || ot.contains(e.ownerDocument, e) || (r = ot.style(e, t)),
                on.test(r) && nn.test(t) && (i = s.width,
                    o = s.minWidth,
                    a = s.maxWidth,
                    s.minWidth = s.maxWidth = s.width = r,
                    r = n.width,
                    s.width = i,
                    s.minWidth = o,
                    s.maxWidth = a)),
                    void 0 === r ? r : r + ""
            }
    ) : ht.documentElement.currentStyle && (en = function(e) {
            return e.currentStyle
        }
            ,
            tn = function(e, t, n) {
                var i, o, a, r, s = e.style;
                return n = n || en(e),
                    r = n ? n[t] : void 0,
                null == r && s && s[t] && (r = s[t]),
                on.test(r) && !an.test(t) && (i = s.left,
                    o = e.runtimeStyle,
                    a = o && o.left,
                a && (o.left = e.currentStyle.left),
                    s.left = "fontSize" === t ? "1em" : r,
                    r = s.pixelLeft + "px",
                    s.left = i,
                a && (o.left = a)),
                    void 0 === r ? r : r + "" || "auto"
            }
    ),
        function() {
            function t() {
                var t, n, i, o;
                n = ht.getElementsByTagName("body")[0],
                n && n.style && (t = ht.createElement("div"),
                    i = ht.createElement("div"),
                    i.style.cssText = "position:absolute;border:0;width:0;height:0;top:0;left:-9999px",
                    n.appendChild(i).appendChild(t),
                    t.style.cssText = "-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;display:block;margin-top:1%;top:1%;border:1px;padding:1px;width:4px;position:absolute",
                    a = r = !1,
                    l = !0,
                e.getComputedStyle && (a = "1%" !== (e.getComputedStyle(t, null) || {}).top,
                    r = "4px" === (e.getComputedStyle(t, null) || {
                        width: "4px"
                    }).width,
                    o = t.appendChild(ht.createElement("div")),
                    o.style.cssText = t.style.cssText = "-webkit-box-sizing:content-box;-moz-box-sizing:content-box;box-sizing:content-box;display:block;margin:0;border:0;padding:0",
                    o.style.marginRight = o.style.width = "0",
                    t.style.width = "1px",
                    l = !parseFloat((e.getComputedStyle(o, null) || {}).marginRight)),
                    t.innerHTML = "<table><tr><td></td><td>t</td></tr></table>",
                    o = t.getElementsByTagName("td"),
                    o[0].style.cssText = "margin:0;border:0;padding:0;display:none",
                    s = 0 === o[0].offsetHeight,
                s && (o[0].style.display = "",
                    o[1].style.display = "none",
                    s = 0 === o[0].offsetHeight),
                    n.removeChild(i))
            }
            var n, i, o, a, r, s, l;
            n = ht.createElement("div"),
                n.innerHTML = "  <link/><table></table><a href='/a'>a</a><input type='checkbox'/>",
                o = n.getElementsByTagName("a")[0],
                i = o && o.style,
            i && (i.cssText = "float:left;opacity:.5",
                nt.opacity = "0.5" === i.opacity,
                nt.cssFloat = !!i.cssFloat,
                n.style.backgroundClip = "content-box",
                n.cloneNode(!0).style.backgroundClip = "",
                nt.clearCloneStyle = "content-box" === n.style.backgroundClip,
                nt.boxSizing = "" === i.boxSizing || "" === i.MozBoxSizing || "" === i.WebkitBoxSizing,
                ot.extend(nt, {
                    reliableHiddenOffsets: function() {
                        return null == s && t(),
                            s
                    },
                    boxSizingReliable: function() {
                        return null == r && t(),
                            r
                    },
                    pixelPosition: function() {
                        return null == a && t(),
                            a
                    },
                    reliableMarginRight: function() {
                        return null == l && t(),
                            l
                    }
                }))
        }(),
        ot.swap = function(e, t, n, i) {
            var o, a, r = {};
            for (a in t)
                r[a] = e.style[a],
                    e.style[a] = t[a];
            o = n.apply(e, i || []);
            for (a in t)
                e.style[a] = r[a];
            return o
        }
    ;
    var rn = /alpha\([^)]*\)/i
        , sn = /opacity\s*=\s*([^)]*)/
        , ln = /^(none|table(?!-c[ea]).+)/
        , cn = new RegExp("^(" + Nt + ")(.*)$","i")
        , un = new RegExp("^([+-])=(" + Nt + ")","i")
        , dn = {
        position: "absolute",
        visibility: "hidden",
        display: "block"
    }
        , fn = {
        letterSpacing: "0",
        fontWeight: "400"
    }
        , pn = ["Webkit", "O", "Moz", "ms"];
    ot.extend({
        cssHooks: {
            opacity: {
                get: function(e, t) {
                    if (t) {
                        var n = tn(e, "opacity");
                        return "" === n ? "1" : n
                    }
                }
            }
        },
        cssNumber: {
            columnCount: !0,
            fillOpacity: !0,
            flexGrow: !0,
            flexShrink: !0,
            fontWeight: !0,
            lineHeight: !0,
            opacity: !0,
            order: !0,
            orphans: !0,
            widows: !0,
            zIndex: !0,
            zoom: !0
        },
        cssProps: {
            "float": nt.cssFloat ? "cssFloat" : "styleFloat"
        },
        style: function(e, t, n, i) {
            if (e && 3 !== e.nodeType && 8 !== e.nodeType && e.style) {
                var o, a, r, s = ot.camelCase(t), l = e.style;
                if (t = ot.cssProps[s] || (ot.cssProps[s] = S(l, s)),
                        r = ot.cssHooks[t] || ot.cssHooks[s],
                    void 0 === n)
                    return r && "get"in r && void 0 !== (o = r.get(e, !1, i)) ? o : l[t];
                if (a = typeof n,
                    "string" === a && (o = un.exec(n)) && (n = (o[1] + 1) * o[2] + parseFloat(ot.css(e, t)),
                        a = "number"),
                    null != n && n === n && ("number" !== a || ot.cssNumber[s] || (n += "px"),
                    nt.clearCloneStyle || "" !== n || 0 !== t.indexOf("background") || (l[t] = "inherit"),
                        !(r && "set"in r && void 0 === (n = r.set(e, n, i)))))
                    try {
                        l[t] = n
                    } catch (c) {}
            }
        },
        css: function(e, t, n, i) {
            var o, a, r, s = ot.camelCase(t);
            return t = ot.cssProps[s] || (ot.cssProps[s] = S(e.style, s)),
                r = ot.cssHooks[t] || ot.cssHooks[s],
            r && "get"in r && (a = r.get(e, !0, n)),
            void 0 === a && (a = tn(e, t, i)),
            "normal" === a && t in fn && (a = fn[t]),
                "" === n || n ? (o = parseFloat(a),
                    n === !0 || ot.isNumeric(o) ? o || 0 : a) : a
        }
    }),
        ot.each(["height", "width"], function(e, t) {
            ot.cssHooks[t] = {
                get: function(e, n, i) {
                    return n ? ln.test(ot.css(e, "display")) && 0 === e.offsetWidth ? ot.swap(e, dn, function() {
                        return M(e, t, i)
                    }) : M(e, t, i) : void 0
                },
                set: function(e, n, i) {
                    var o = i && en(e);
                    return $(e, n, i ? D(e, t, i, nt.boxSizing && "border-box" === ot.css(e, "boxSizing", !1, o), o) : 0)
                }
            }
        }),
    nt.opacity || (ot.cssHooks.opacity = {
        get: function(e, t) {
            return sn.test((t && e.currentStyle ? e.currentStyle.filter : e.style.filter) || "") ? .01 * parseFloat(RegExp.$1) + "" : t ? "1" : ""
        },
        set: function(e, t) {
            var n = e.style
                , i = e.currentStyle
                , o = ot.isNumeric(t) ? "alpha(opacity=" + 100 * t + ")" : ""
                , a = i && i.filter || n.filter || "";
            n.zoom = 1,
            (t >= 1 || "" === t) && "" === ot.trim(a.replace(rn, "")) && n.removeAttribute && (n.removeAttribute("filter"),
            "" === t || i && !i.filter) || (n.filter = rn.test(a) ? a.replace(rn, o) : a + " " + o)
        }
    }),
        ot.cssHooks.marginRight = N(nt.reliableMarginRight, function(e, t) {
            return t ? ot.swap(e, {
                display: "inline-block"
            }, tn, [e, "marginRight"]) : void 0
        }),
        ot.each({
            margin: "",
            padding: "",
            border: "Width"
        }, function(e, t) {
            ot.cssHooks[e + t] = {
                expand: function(n) {
                    for (var i = 0, o = {}, a = "string" == typeof n ? n.split(" ") : [n]; 4 > i; i++)
                        o[e + St[i] + t] = a[i] || a[i - 2] || a[0];
                    return o
                }
            },
            nn.test(e) || (ot.cssHooks[e + t].set = $)
        }),
        ot.fn.extend({
            css: function(e, t) {
                return $t(this, function(e, t, n) {
                    var i, o, a = {}, r = 0;
                    if (ot.isArray(t)) {
                        for (i = en(e),
                                 o = t.length; o > r; r++)
                            a[t[r]] = ot.css(e, t[r], !1, i);
                        return a
                    }
                    return void 0 !== n ? ot.style(e, t, n) : ot.css(e, t)
                }, e, t, arguments.length > 1)
            },
            show: function() {
                return L(this, !0)
            },
            hide: function() {
                return L(this)
            },
            toggle: function(e) {
                return "boolean" == typeof e ? e ? this.show() : this.hide() : this.each(function() {
                    Lt(this) ? ot(this).show() : ot(this).hide()
                })
            }
        }),
        ot.Tween = A,
        A.prototype = {
            constructor: A,
            init: function(e, t, n, i, o, a) {
                this.elem = e,
                    this.prop = n,
                    this.easing = o || "swing",
                    this.options = t,
                    this.start = this.now = this.cur(),
                    this.end = i,
                    this.unit = a || (ot.cssNumber[n] ? "" : "px")
            },
            cur: function() {
                var e = A.propHooks[this.prop];
                return e && e.get ? e.get(this) : A.propHooks._default.get(this)
            },
            run: function(e) {
                var t, n = A.propHooks[this.prop];
                return this.pos = t = this.options.duration ? ot.easing[this.easing](e, this.options.duration * e, 0, 1, this.options.duration) : e,
                    this.now = (this.end - this.start) * t + this.start,
                this.options.step && this.options.step.call(this.elem, this.now, this),
                    n && n.set ? n.set(this) : A.propHooks._default.set(this),
                    this
            }
        },
        A.prototype.init.prototype = A.prototype,
        A.propHooks = {
            _default: {
                get: function(e) {
                    var t;
                    return null == e.elem[e.prop] || e.elem.style && null != e.elem.style[e.prop] ? (t = ot.css(e.elem, e.prop, ""),
                        t && "auto" !== t ? t : 0) : e.elem[e.prop]
                },
                set: function(e) {
                    ot.fx.step[e.prop] ? ot.fx.step[e.prop](e) : e.elem.style && (null != e.elem.style[ot.cssProps[e.prop]] || ot.cssHooks[e.prop]) ? ot.style(e.elem, e.prop, e.now + e.unit) : e.elem[e.prop] = e.now
                }
            }
        },
        A.propHooks.scrollTop = A.propHooks.scrollLeft = {
            set: function(e) {
                e.elem.nodeType && e.elem.parentNode && (e.elem[e.prop] = e.now)
            }
        },
        ot.easing = {
            linear: function(e) {
                return e
            },
            swing: function(e) {
                return .5 - Math.cos(e * Math.PI) / 2
            }
        },
        ot.fx = A.prototype.init,
        ot.fx.step = {};
    var hn, mn, gn = /^(?:toggle|show|hide)$/, vn = new RegExp("^(?:([+-])=|)(" + Nt + ")([a-z%]*)$","i"), yn = /queueHooks$/, bn = [H], xn = {
        "*": [function(e, t) {
            var n = this.createTween(e, t)
                , i = n.cur()
                , o = vn.exec(t)
                , a = o && o[3] || (ot.cssNumber[e] ? "" : "px")
                , r = (ot.cssNumber[e] || "px" !== a && +i) && vn.exec(ot.css(n.elem, e))
                , s = 1
                , l = 20;
            if (r && r[3] !== a) {
                a = a || r[3],
                    o = o || [],
                    r = +i || 1;
                do
                    s = s || ".5",
                        r /= s,
                        ot.style(n.elem, e, r + a);
                while (s !== (s = n.cur() / i) && 1 !== s && --l)
            }
            return o && (r = n.start = +r || +i || 0,
                n.unit = a,
                n.end = o[1] ? r + (o[1] + 1) * o[2] : +o[2]),
                n
        }
        ]
    };
    ot.Animation = ot.extend(F, {
        tweener: function(e, t) {
            ot.isFunction(e) ? (t = e,
                e = ["*"]) : e = e.split(" ");
            for (var n, i = 0, o = e.length; o > i; i++)
                n = e[i],
                    xn[n] = xn[n] || [],
                    xn[n].unshift(t)
        },
        prefilter: function(e, t) {
            t ? bn.unshift(e) : bn.push(e)
        }
    }),
        ot.speed = function(e, t, n) {
            var i = e && "object" == typeof e ? ot.extend({}, e) : {
                complete: n || !n && t || ot.isFunction(e) && e,
                duration: e,
                easing: n && t || t && !ot.isFunction(t) && t
            };
            return i.duration = ot.fx.off ? 0 : "number" == typeof i.duration ? i.duration : i.duration in ot.fx.speeds ? ot.fx.speeds[i.duration] : ot.fx.speeds._default,
            (null == i.queue || i.queue === !0) && (i.queue = "fx"),
                i.old = i.complete,
                i.complete = function() {
                    ot.isFunction(i.old) && i.old.call(this),
                    i.queue && ot.dequeue(this, i.queue)
                }
                ,
                i
        }
        ,
        ot.fn.extend({
            fadeTo: function(e, t, n, i) {
                return this.filter(Lt).css("opacity", 0).show().end().animate({
                    opacity: t
                }, e, n, i)
            },
            animate: function(e, t, n, i) {
                var o = ot.isEmptyObject(e)
                    , a = ot.speed(t, n, i)
                    , r = function() {
                    var t = F(this, ot.extend({}, e), a);
                    (o || ot._data(this, "finish")) && t.stop(!0)
                };
                return r.finish = r,
                    o || a.queue === !1 ? this.each(r) : this.queue(a.queue, r)
            },
            stop: function(e, t, n) {
                var i = function(e) {
                    var t = e.stop;
                    delete e.stop,
                        t(n)
                };
                return "string" != typeof e && (n = t,
                    t = e,
                    e = void 0),
                t && e !== !1 && this.queue(e || "fx", []),
                    this.each(function() {
                        var t = !0
                            , o = null != e && e + "queueHooks"
                            , a = ot.timers
                            , r = ot._data(this);
                        if (o)
                            r[o] && r[o].stop && i(r[o]);
                        else
                            for (o in r)
                                r[o] && r[o].stop && yn.test(o) && i(r[o]);
                        for (o = a.length; o--; )
                            a[o].elem !== this || null != e && a[o].queue !== e || (a[o].anim.stop(n),
                                t = !1,
                                a.splice(o, 1));
                        (t || !n) && ot.dequeue(this, e)
                    })
            },
            finish: function(e) {
                return e !== !1 && (e = e || "fx"),
                    this.each(function() {
                        var t, n = ot._data(this), i = n[e + "queue"], o = n[e + "queueHooks"], a = ot.timers, r = i ? i.length : 0;
                        for (n.finish = !0,
                                 ot.queue(this, e, []),
                             o && o.stop && o.stop.call(this, !0),
                                 t = a.length; t--; )
                            a[t].elem === this && a[t].queue === e && (a[t].anim.stop(!0),
                                a.splice(t, 1));
                        for (t = 0; r > t; t++)
                            i[t] && i[t].finish && i[t].finish.call(this);
                        delete n.finish
                    })
            }
        }),
        ot.each(["toggle", "show", "hide"], function(e, t) {
            var n = ot.fn[t];
            ot.fn[t] = function(e, i, o) {
                return null == e || "boolean" == typeof e ? n.apply(this, arguments) : this.animate(I(t, !0), e, i, o)
            }
        }),
        ot.each({
            slideDown: I("show"),
            slideUp: I("hide"),
            slideToggle: I("toggle"),
            fadeIn: {
                opacity: "show"
            },
            fadeOut: {
                opacity: "hide"
            },
            fadeToggle: {
                opacity: "toggle"
            }
        }, function(e, t) {
            ot.fn[e] = function(e, n, i) {
                return this.animate(t, e, n, i)
            }
        }),
        ot.timers = [],
        ot.fx.tick = function() {
            var e, t = ot.timers, n = 0;
            for (hn = ot.now(); n < t.length; n++)
                e = t[n],
                e() || t[n] !== e || t.splice(n--, 1);
            t.length || ot.fx.stop(),
                hn = void 0
        }
        ,
        ot.fx.timer = function(e) {
            ot.timers.push(e),
                e() ? ot.fx.start() : ot.timers.pop()
        }
        ,
        ot.fx.interval = 13,
        ot.fx.start = function() {
            mn || (mn = setInterval(ot.fx.tick, ot.fx.interval))
        }
        ,
        ot.fx.stop = function() {
            clearInterval(mn),
                mn = null
        }
        ,
        ot.fx.speeds = {
            slow: 600,
            fast: 200,
            _default: 400
        },
        ot.fn.delay = function(e, t) {
            return e = ot.fx ? ot.fx.speeds[e] || e : e,
                t = t || "fx",
                this.queue(t, function(t, n) {
                    var i = setTimeout(t, e);
                    n.stop = function() {
                        clearTimeout(i)
                    }
                })
        }
        ,
        function() {
            var e, t, n, i, o;
            t = ht.createElement("div"),
                t.setAttribute("className", "t"),
                t.innerHTML = "  <link/><table></table><a href='/a'>a</a><input type='checkbox'/>",
                i = t.getElementsByTagName("a")[0],
                n = ht.createElement("select"),
                o = n.appendChild(ht.createElement("option")),
                e = t.getElementsByTagName("input")[0],
                i.style.cssText = "top:1px",
                nt.getSetAttribute = "t" !== t.className,
                nt.style = /top/.test(i.getAttribute("style")),
                nt.hrefNormalized = "/a" === i.getAttribute("href"),
                nt.checkOn = !!e.value,
                nt.optSelected = o.selected,
                nt.enctype = !!ht.createElement("form").enctype,
                n.disabled = !0,
                nt.optDisabled = !o.disabled,
                e = ht.createElement("input"),
                e.setAttribute("value", ""),
                nt.input = "" === e.getAttribute("value"),
                e.value = "t",
                e.setAttribute("type", "radio"),
                nt.radioValue = "t" === e.value
        }();
    var Cn = /\r/g;
    ot.fn.extend({
        val: function(e) {
            var t, n, i, o = this[0];
            {
                if (arguments.length)
                    return i = ot.isFunction(e),
                        this.each(function(n) {
                            var o;
                            1 === this.nodeType && (o = i ? e.call(this, n, ot(this).val()) : e,
                                null == o ? o = "" : "number" == typeof o ? o += "" : ot.isArray(o) && (o = ot.map(o, function(e) {
                                    return null == e ? "" : e + ""
                                })),
                                t = ot.valHooks[this.type] || ot.valHooks[this.nodeName.toLowerCase()],
                            t && "set"in t && void 0 !== t.set(this, o, "value") || (this.value = o))
                        });
                if (o)
                    return t = ot.valHooks[o.type] || ot.valHooks[o.nodeName.toLowerCase()],
                        t && "get"in t && void 0 !== (n = t.get(o, "value")) ? n : (n = o.value,
                            "string" == typeof n ? n.replace(Cn, "") : null == n ? "" : n)
            }
        }
    }),
        ot.extend({
            valHooks: {
                option: {
                    get: function(e) {
                        var t = ot.find.attr(e, "value");
                        return null != t ? t : ot.trim(ot.text(e))
                    }
                },
                select: {
                    get: function(e) {
                        for (var t, n, i = e.options, o = e.selectedIndex, a = "select-one" === e.type || 0 > o, r = a ? null : [], s = a ? o + 1 : i.length, l = 0 > o ? s : a ? o : 0; s > l; l++)
                            if (n = i[l],
                                    !(!n.selected && l !== o || (nt.optDisabled ? n.disabled : null !== n.getAttribute("disabled")) || n.parentNode.disabled && ot.nodeName(n.parentNode, "optgroup"))) {
                                if (t = ot(n).val(),
                                        a)
                                    return t;
                                r.push(t)
                            }
                        return r
                    },
                    set: function(e, t) {
                        for (var n, i, o = e.options, a = ot.makeArray(t), r = o.length; r--; )
                            if (i = o[r],
                                ot.inArray(ot.valHooks.option.get(i), a) >= 0)
                                try {
                                    i.selected = n = !0
                                } catch (s) {
                                    i.scrollHeight
                                }
                            else
                                i.selected = !1;
                        return n || (e.selectedIndex = -1),
                            o
                    }
                }
            }
        }),
        ot.each(["radio", "checkbox"], function() {
            ot.valHooks[this] = {
                set: function(e, t) {
                    return ot.isArray(t) ? e.checked = ot.inArray(ot(e).val(), t) >= 0 : void 0
                }
            },
            nt.checkOn || (ot.valHooks[this].get = function(e) {
                    return null === e.getAttribute("value") ? "on" : e.value
                }
            )
        });
    var wn, kn, Tn = ot.expr.attrHandle, En = /^(?:checked|selected)$/i, Nn = nt.getSetAttribute, Sn = nt.input;
    ot.fn.extend({
        attr: function(e, t) {
            return $t(this, ot.attr, e, t, arguments.length > 1)
        },
        removeAttr: function(e) {
            return this.each(function() {
                ot.removeAttr(this, e)
            })
        }
    }),
        ot.extend({
            attr: function(e, t, n) {
                var i, o, a = e.nodeType;
                if (e && 3 !== a && 8 !== a && 2 !== a)
                    return typeof e.getAttribute === kt ? ot.prop(e, t, n) : (1 === a && ot.isXMLDoc(e) || (t = t.toLowerCase(),
                        i = ot.attrHooks[t] || (ot.expr.match.bool.test(t) ? kn : wn)),
                        void 0 === n ? i && "get"in i && null !== (o = i.get(e, t)) ? o : (o = ot.find.attr(e, t),
                            null == o ? void 0 : o) : null !== n ? i && "set"in i && void 0 !== (o = i.set(e, n, t)) ? o : (e.setAttribute(t, n + ""),
                            n) : (ot.removeAttr(e, t),
                            void 0))
            },
            removeAttr: function(e, t) {
                var n, i, o = 0, a = t && t.match(bt);
                if (a && 1 === e.nodeType)
                    for (; n = a[o++]; )
                        i = ot.propFix[n] || n,
                            ot.expr.match.bool.test(n) ? Sn && Nn || !En.test(n) ? e[i] = !1 : e[ot.camelCase("default-" + n)] = e[i] = !1 : ot.attr(e, n, ""),
                            e.removeAttribute(Nn ? n : i)
            },
            attrHooks: {
                type: {
                    set: function(e, t) {
                        if (!nt.radioValue && "radio" === t && ot.nodeName(e, "input")) {
                            var n = e.value;
                            return e.setAttribute("type", t),
                            n && (e.value = n),
                                t
                        }
                    }
                }
            }
        }),
        kn = {
            set: function(e, t, n) {
                return t === !1 ? ot.removeAttr(e, n) : Sn && Nn || !En.test(n) ? e.setAttribute(!Nn && ot.propFix[n] || n, n) : e[ot.camelCase("default-" + n)] = e[n] = !0,
                    n
            }
        },
        ot.each(ot.expr.match.bool.source.match(/\w+/g), function(e, t) {
            var n = Tn[t] || ot.find.attr;
            Tn[t] = Sn && Nn || !En.test(t) ? function(e, t, i) {
                    var o, a;
                    return i || (a = Tn[t],
                        Tn[t] = o,
                        o = null != n(e, t, i) ? t.toLowerCase() : null,
                        Tn[t] = a),
                        o
                }
                : function(e, t, n) {
                    return n ? void 0 : e[ot.camelCase("default-" + t)] ? t.toLowerCase() : null
                }
        }),
    Sn && Nn || (ot.attrHooks.value = {
        set: function(e, t, n) {
            return ot.nodeName(e, "input") ? (e.defaultValue = t,
                void 0) : wn && wn.set(e, t, n)
        }
    }),
    Nn || (wn = {
        set: function(e, t, n) {
            var i = e.getAttributeNode(n);
            return i || e.setAttributeNode(i = e.ownerDocument.createAttribute(n)),
                i.value = t += "",
                "value" === n || t === e.getAttribute(n) ? t : void 0
        }
    },
        Tn.id = Tn.name = Tn.coords = function(e, t, n) {
            var i;
            return n ? void 0 : (i = e.getAttributeNode(t)) && "" !== i.value ? i.value : null
        }
        ,
        ot.valHooks.button = {
            get: function(e, t) {
                var n = e.getAttributeNode(t);
                return n && n.specified ? n.value : void 0
            },
            set: wn.set
        },
        ot.attrHooks.contenteditable = {
            set: function(e, t, n) {
                wn.set(e, "" === t ? !1 : t, n)
            }
        },
        ot.each(["width", "height"], function(e, t) {
            ot.attrHooks[t] = {
                set: function(e, n) {
                    return "" === n ? (e.setAttribute(t, "auto"),
                        n) : void 0
                }
            }
        })),
    nt.style || (ot.attrHooks.style = {
        get: function(e) {
            return e.style.cssText || void 0
        },
        set: function(e, t) {
            return e.style.cssText = t + ""
        }
    });
    var Ln = /^(?:input|select|textarea|button|object)$/i
        , $n = /^(?:a|area)$/i;
    ot.fn.extend({
        prop: function(e, t) {
            return $t(this, ot.prop, e, t, arguments.length > 1)
        },
        removeProp: function(e) {
            return e = ot.propFix[e] || e,
                this.each(function() {
                    try {
                        this[e] = void 0,
                            delete this[e]
                    } catch (t) {}
                })
        }
    }),
        ot.extend({
            propFix: {
                "for": "htmlFor",
                "class": "className"
            },
            prop: function(e, t, n) {
                var i, o, a, r = e.nodeType;
                if (e && 3 !== r && 8 !== r && 2 !== r)
                    return a = 1 !== r || !ot.isXMLDoc(e),
                    a && (t = ot.propFix[t] || t,
                        o = ot.propHooks[t]),
                        void 0 !== n ? o && "set"in o && void 0 !== (i = o.set(e, n, t)) ? i : e[t] = n : o && "get"in o && null !== (i = o.get(e, t)) ? i : e[t]
            },
            propHooks: {
                tabIndex: {
                    get: function(e) {
                        var t = ot.find.attr(e, "tabindex");
                        return t ? parseInt(t, 10) : Ln.test(e.nodeName) || $n.test(e.nodeName) && e.href ? 0 : -1
                    }
                }
            }
        }),
    nt.hrefNormalized || ot.each(["href", "src"], function(e, t) {
        ot.propHooks[t] = {
            get: function(e) {
                return e.getAttribute(t, 4)
            }
        }
    }),
    nt.optSelected || (ot.propHooks.selected = {
        get: function(e) {
            var t = e.parentNode;
            return t && (t.selectedIndex,
            t.parentNode && t.parentNode.selectedIndex),
                null
        }
    }),
        ot.each(["tabIndex", "readOnly", "maxLength", "cellSpacing", "cellPadding", "rowSpan", "colSpan", "useMap", "frameBorder", "contentEditable"], function() {
            ot.propFix[this.toLowerCase()] = this
        }),
    nt.enctype || (ot.propFix.enctype = "encoding");
    var Dn = /[\t\r\n\f]/g;
    ot.fn.extend({
        addClass: function(e) {
            var t, n, i, o, a, r, s = 0, l = this.length, c = "string" == typeof e && e;
            if (ot.isFunction(e))
                return this.each(function(t) {
                    ot(this).addClass(e.call(this, t, this.className))
                });
            if (c)
                for (t = (e || "").match(bt) || []; l > s; s++)
                    if (n = this[s],
                            i = 1 === n.nodeType && (n.className ? (" " + n.className + " ").replace(Dn, " ") : " ")) {
                        for (a = 0; o = t[a++]; )
                            i.indexOf(" " + o + " ") < 0 && (i += o + " ");
                        r = ot.trim(i),
                        n.className !== r && (n.className = r)
                    }
            return this
        },
        removeClass: function(e) {
            var t, n, i, o, a, r, s = 0, l = this.length, c = 0 === arguments.length || "string" == typeof e && e;
            if (ot.isFunction(e))
                return this.each(function(t) {
                    ot(this).removeClass(e.call(this, t, this.className))
                });
            if (c)
                for (t = (e || "").match(bt) || []; l > s; s++)
                    if (n = this[s],
                            i = 1 === n.nodeType && (n.className ? (" " + n.className + " ").replace(Dn, " ") : "")) {
                        for (a = 0; o = t[a++]; )
                            for (; i.indexOf(" " + o + " ") >= 0; )
                                i = i.replace(" " + o + " ", " ");
                        r = e ? ot.trim(i) : "",
                        n.className !== r && (n.className = r)
                    }
            return this
        },
        toggleClass: function(e, t) {
            var n = typeof e;
            return "boolean" == typeof t && "string" === n ? t ? this.addClass(e) : this.removeClass(e) : ot.isFunction(e) ? this.each(function(n) {
                ot(this).toggleClass(e.call(this, n, this.className, t), t)
            }) : this.each(function() {
                if ("string" === n)
                    for (var t, i = 0, o = ot(this), a = e.match(bt) || []; t = a[i++]; )
                        o.hasClass(t) ? o.removeClass(t) : o.addClass(t);
                else
                    (n === kt || "boolean" === n) && (this.className && ot._data(this, "__className__", this.className),
                        this.className = this.className || e === !1 ? "" : ot._data(this, "__className__") || "")
            })
        },
        hasClass: function(e) {
            for (var t = " " + e + " ", n = 0, i = this.length; i > n; n++)
                if (1 === this[n].nodeType && (" " + this[n].className + " ").replace(Dn, " ").indexOf(t) >= 0)
                    return !0;
            return !1
        }
    }),
        ot.each("blur focus focusin focusout load resize scroll unload click dblclick mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave change select submit keydown keypress keyup error contextmenu".split(" "), function(e, t) {
            ot.fn[t] = function(e, n) {
                return arguments.length > 0 ? this.on(t, null, e, n) : this.trigger(t)
            }
        }),
        ot.fn.extend({
            hover: function(e, t) {
                return this.mouseenter(e).mouseleave(t || e)
            },
            bind: function(e, t, n) {
                return this.on(e, null, t, n)
            },
            unbind: function(e, t) {
                return this.off(e, null, t)
            },
            delegate: function(e, t, n, i) {
                return this.on(t, e, n, i)
            },
            undelegate: function(e, t, n) {
                return 1 === arguments.length ? this.off(e, "**") : this.off(t, e || "**", n)
            }
        });
    var Mn = ot.now()
        , An = /\?/
        , jn = /(,)|(\[|{)|(}|])|"(?:[^"\\\r\n]|\\["\\\/bfnrt]|\\u[\da-fA-F]{4})*"\s*:?|true|false|null|-?(?!0\d)\d+(?:\.\d+|)(?:[eE][+-]?\d+|)/g;
    ot.parseJSON = function(t) {
        if (e.JSON && e.JSON.parse)
            return e.JSON.parse(t + "");
        var n, i = null, o = ot.trim(t + "");
        return o && !ot.trim(o.replace(jn, function(e, t, o, a) {
            return n && t && (i = 0),
                0 === i ? e : (n = o || t,
                    i += !a - !o,
                    "")
        })) ? Function("return " + o)() : ot.error("Invalid JSON: " + t)
    }
        ,
        ot.parseXML = function(t) {
            var n, i;
            if (!t || "string" != typeof t)
                return null;
            try {
                e.DOMParser ? (i = new DOMParser,
                    n = i.parseFromString(t, "text/xml")) : (n = new ActiveXObject("Microsoft.XMLDOM"),
                    n.async = "false",
                    n.loadXML(t))
            } catch (o) {
                n = void 0
            }
            return n && n.documentElement && !n.getElementsByTagName("parsererror").length || ot.error("Invalid XML: " + t),
                n
        }
    ;
    var In, On, Hn = /#.*$/, Pn = /([?&])_=[^&]*/, Fn = /^(.*?):[ \t]*([^\r\n]*)\r?$/gm, Bn = /^(?:about|app|app-storage|.+-extension|file|res|widget):$/, _n = /^(?:GET|HEAD)$/, qn = /^\/\//, zn = /^([\w.+-]+:)(?:\/\/(?:[^\/?#]*@|)([^\/?#:]*)(?::(\d+)|)|)/, Rn = {}, Wn = {}, Xn = "*/".concat("*");
    try {
        On = location.href
    } catch (Un) {
        On = ht.createElement("a"),
            On.href = "",
            On = On.href
    }
    In = zn.exec(On.toLowerCase()) || [],
        ot.extend({
            active: 0,
            lastModified: {},
            etag: {},
            ajaxSettings: {
                url: On,
                type: "GET",
                isLocal: Bn.test(In[1]),
                global: !0,
                processData: !0,
                async: !0,
                contentType: "application/x-www-form-urlencoded; charset=UTF-8",
                accepts: {
                    "*": Xn,
                    text: "text/plain",
                    html: "text/html",
                    xml: "application/xml, text/xml",
                    json: "application/json, text/javascript"
                },
                contents: {
                    xml: /xml/,
                    html: /html/,
                    json: /json/
                },
                responseFields: {
                    xml: "responseXML",
                    text: "responseText",
                    json: "responseJSON"
                },
                converters: {
                    "* text": String,
                    "text html": !0,
                    "text json": ot.parseJSON,
                    "text xml": ot.parseXML
                },
                flatOptions: {
                    url: !0,
                    context: !0
                }
            },
            ajaxSetup: function(e, t) {
                return t ? q(q(e, ot.ajaxSettings), t) : q(ot.ajaxSettings, e)
            },
            ajaxPrefilter: B(Rn),
            ajaxTransport: B(Wn),
            ajax: function(e, t) {
                function n(e, t, n, i) {
                    var o, u, v, y, x, w = t;
                    2 !== b && (b = 2,
                    s && clearTimeout(s),
                        c = void 0,
                        r = i || "",
                        C.readyState = e > 0 ? 4 : 0,
                        o = e >= 200 && 300 > e || 304 === e,
                    n && (y = z(d, C, n)),
                        y = R(d, y, C, o),
                        o ? (d.ifModified && (x = C.getResponseHeader("Last-Modified"),
                        x && (ot.lastModified[a] = x),
                            x = C.getResponseHeader("etag"),
                        x && (ot.etag[a] = x)),
                            204 === e || "HEAD" === d.type ? w = "nocontent" : 304 === e ? w = "notmodified" : (w = y.state,
                                u = y.data,
                                v = y.error,
                                o = !v)) : (v = w,
                        (e || !w) && (w = "error",
                        0 > e && (e = 0))),
                        C.status = e,
                        C.statusText = (t || w) + "",
                        o ? h.resolveWith(f, [u, w, C]) : h.rejectWith(f, [C, w, v]),
                        C.statusCode(g),
                        g = void 0,
                    l && p.trigger(o ? "ajaxSuccess" : "ajaxError", [C, d, o ? u : v]),
                        m.fireWith(f, [C, w]),
                    l && (p.trigger("ajaxComplete", [C, d]),
                    --ot.active || ot.event.trigger("ajaxStop")))
                }
                "object" == typeof e && (t = e,
                    e = void 0),
                    t = t || {};
                var i, o, a, r, s, l, c, u, d = ot.ajaxSetup({}, t), f = d.context || d, p = d.context && (f.nodeType || f.jquery) ? ot(f) : ot.event, h = ot.Deferred(), m = ot.Callbacks("once memory"), g = d.statusCode || {}, v = {}, y = {}, b = 0, x = "canceled", C = {
                    readyState: 0,
                    getResponseHeader: function(e) {
                        var t;
                        if (2 === b) {
                            if (!u)
                                for (u = {}; t = Fn.exec(r); )
                                    u[t[1].toLowerCase()] = t[2];
                            t = u[e.toLowerCase()]
                        }
                        return null == t ? null : t
                    },
                    getAllResponseHeaders: function() {
                        return 2 === b ? r : null
                    },
                    setRequestHeader: function(e, t) {
                        var n = e.toLowerCase();
                        return b || (e = y[n] = y[n] || e,
                            v[e] = t),
                            this
                    },
                    overrideMimeType: function(e) {
                        return b || (d.mimeType = e),
                            this
                    },
                    statusCode: function(e) {
                        var t;
                        if (e)
                            if (2 > b)
                                for (t in e)
                                    g[t] = [g[t], e[t]];
                            else
                                C.always(e[C.status]);
                        return this
                    },
                    abort: function(e) {
                        var t = e || x;
                        return c && c.abort(t),
                            n(0, t),
                            this
                    }
                };
                if (h.promise(C).complete = m.add,
                        C.success = C.done,
                        C.error = C.fail,
                        d.url = ((e || d.url || On) + "").replace(Hn, "").replace(qn, In[1] + "//"),
                        d.type = t.method || t.type || d.method || d.type,
                        d.dataTypes = ot.trim(d.dataType || "*").toLowerCase().match(bt) || [""],
                    null == d.crossDomain && (i = zn.exec(d.url.toLowerCase()),
                        d.crossDomain = !(!i || i[1] === In[1] && i[2] === In[2] && (i[3] || ("http:" === i[1] ? "80" : "443")) === (In[3] || ("http:" === In[1] ? "80" : "443")))),
                    d.data && d.processData && "string" != typeof d.data && (d.data = ot.param(d.data, d.traditional)),
                        _(Rn, d, t, C),
                    2 === b)
                    return C;
                l = d.global,
                l && 0 === ot.active++ && ot.event.trigger("ajaxStart"),
                    d.type = d.type.toUpperCase(),
                    d.hasContent = !_n.test(d.type),
                    a = d.url,
                d.hasContent || (d.data && (a = d.url += (An.test(a) ? "&" : "?") + d.data,
                    delete d.data),
                d.cache === !1 && (d.url = Pn.test(a) ? a.replace(Pn, "$1_=" + Mn++) : a + (An.test(a) ? "&" : "?") + "_=" + Mn++)),
                d.ifModified && (ot.lastModified[a] && C.setRequestHeader("If-Modified-Since", ot.lastModified[a]),
                ot.etag[a] && C.setRequestHeader("If-None-Match", ot.etag[a])),
                (d.data && d.hasContent && d.contentType !== !1 || t.contentType) && C.setRequestHeader("Content-Type", d.contentType),
                    C.setRequestHeader("Accept", d.dataTypes[0] && d.accepts[d.dataTypes[0]] ? d.accepts[d.dataTypes[0]] + ("*" !== d.dataTypes[0] ? ", " + Xn + "; q=0.01" : "") : d.accepts["*"]);
                for (o in d.headers)
                    C.setRequestHeader(o, d.headers[o]);
                if (d.beforeSend && (d.beforeSend.call(f, C, d) === !1 || 2 === b))
                    return C.abort();
                x = "abort";
                for (o in {
                    success: 1,
                    error: 1,
                    complete: 1
                })
                    C[o](d[o]);
                if (c = _(Wn, d, t, C)) {
                    C.readyState = 1,
                    l && p.trigger("ajaxSend", [C, d]),
                    d.async && d.timeout > 0 && (s = setTimeout(function() {
                        C.abort("timeout")
                    }, d.timeout));
                    try {
                        b = 1,
                            c.send(v, n)
                    } catch (w) {
                        if (!(2 > b))
                            throw w;
                        n(-1, w)
                    }
                } else
                    n(-1, "No Transport");
                return C
            },
            getJSON: function(e, t, n) {
                return ot.get(e, t, n, "json")
            },
            getScript: function(e, t) {
                return ot.get(e, void 0, t, "script")
            }
        }),
        ot.each(["get", "post"], function(e, t) {
            ot[t] = function(e, n, i, o) {
                return ot.isFunction(n) && (o = o || i,
                    i = n,
                    n = void 0),
                    ot.ajax({
                        url: e,
                        type: t,
                        dataType: o,
                        data: n,
                        success: i
                    })
            }
        }),
        ot.each(["ajaxStart", "ajaxStop", "ajaxComplete", "ajaxError", "ajaxSuccess", "ajaxSend"], function(e, t) {
            ot.fn[t] = function(e) {
                return this.on(t, e)
            }
        }),
        ot._evalUrl = function(e) {
            return ot.ajax({
                url: e,
                type: "GET",
                dataType: "script",
                async: !1,
                global: !1,
                "throws": !0
            })
        }
        ,
        ot.fn.extend({
            wrapAll: function(e) {
                if (ot.isFunction(e))
                    return this.each(function(t) {
                        ot(this).wrapAll(e.call(this, t))
                    });
                if (this[0]) {
                    var t = ot(e, this[0].ownerDocument).eq(0).clone(!0);
                    this[0].parentNode && t.insertBefore(this[0]),
                        t.map(function() {
                            for (var e = this; e.firstChild && 1 === e.firstChild.nodeType; )
                                e = e.firstChild;
                            return e
                        }).append(this)
                }
                return this
            },
            wrapInner: function(e) {
                return ot.isFunction(e) ? this.each(function(t) {
                    ot(this).wrapInner(e.call(this, t))
                }) : this.each(function() {
                    var t = ot(this)
                        , n = t.contents();
                    n.length ? n.wrapAll(e) : t.append(e)
                })
            },
            wrap: function(e) {
                var t = ot.isFunction(e);
                return this.each(function(n) {
                    ot(this).wrapAll(t ? e.call(this, n) : e)
                })
            },
            unwrap: function() {
                return this.parent().each(function() {
                    ot.nodeName(this, "body") || ot(this).replaceWith(this.childNodes)
                }).end()
            }
        }),
        ot.expr.filters.hidden = function(e) {
            return e.offsetWidth <= 0 && e.offsetHeight <= 0 || !nt.reliableHiddenOffsets() && "none" === (e.style && e.style.display || ot.css(e, "display"))
        }
        ,
        ot.expr.filters.visible = function(e) {
            return !ot.expr.filters.hidden(e)
        }
    ;
    var Yn = /%20/g
        , Gn = /\[\]$/
        , Vn = /\r?\n/g
        , Qn = /^(?:submit|button|image|reset|file)$/i
        , Jn = /^(?:input|select|textarea|keygen)/i;
    ot.param = function(e, t) {
        var n, i = [], o = function(e, t) {
            t = ot.isFunction(t) ? t() : null == t ? "" : t,
                i[i.length] = encodeURIComponent(e) + "=" + encodeURIComponent(t)
        };
        if (void 0 === t && (t = ot.ajaxSettings && ot.ajaxSettings.traditional),
            ot.isArray(e) || e.jquery && !ot.isPlainObject(e))
            ot.each(e, function() {
                o(this.name, this.value)
            });
        else
            for (n in e)
                W(n, e[n], t, o);
        return i.join("&").replace(Yn, "+")
    }
        ,
        ot.fn.extend({
            serialize: function() {
                return ot.param(this.serializeArray())
            },
            serializeArray: function() {
                return this.map(function() {
                    var e = ot.prop(this, "elements");
                    return e ? ot.makeArray(e) : this
                }).filter(function() {
                    var e = this.type;
                    return this.name && !ot(this).is(":disabled") && Jn.test(this.nodeName) && !Qn.test(e) && (this.checked || !Dt.test(e))
                }).map(function(e, t) {
                    var n = ot(this).val();
                    return null == n ? null : ot.isArray(n) ? ot.map(n, function(e) {
                        return {
                            name: t.name,
                            value: e.replace(Vn, "\r\n")
                        }
                    }) : {
                        name: t.name,
                        value: n.replace(Vn, "\r\n")
                    }
                }).get()
            }
        }),
        ot.ajaxSettings.xhr = void 0 !== e.ActiveXObject ? function() {
                return !this.isLocal && /^(get|post|head|put|delete|options)$/i.test(this.type) && X() || U()
            }
            : X;
    var Kn = 0
        , Zn = {}
        , ei = ot.ajaxSettings.xhr();
    e.ActiveXObject && ot(e).on("unload", function() {
        for (var e in Zn)
            Zn[e](void 0, !0)
    }),
        nt.cors = !!ei && "withCredentials"in ei,
        ei = nt.ajax = !!ei,
    ei && ot.ajaxTransport(function(e) {
        if (!e.crossDomain || nt.cors) {
            var t;
            return {
                send: function(n, i) {
                    var o, a = e.xhr(), r = ++Kn;
                    if (a.open(e.type, e.url, e.async, e.username, e.password),
                            e.xhrFields)
                        for (o in e.xhrFields)
                            a[o] = e.xhrFields[o];
                    e.mimeType && a.overrideMimeType && a.overrideMimeType(e.mimeType),
                    e.crossDomain || n["X-Requested-With"] || (n["X-Requested-With"] = "XMLHttpRequest");
                    for (o in n)
                        void 0 !== n[o] && a.setRequestHeader(o, n[o] + "");
                    a.send(e.hasContent && e.data || null),
                        t = function(n, o) {
                            var s, l, c;
                            if (t && (o || 4 === a.readyState))
                                if (delete Zn[r],
                                        t = void 0,
                                        a.onreadystatechange = ot.noop,
                                        o)
                                    4 !== a.readyState && a.abort();
                                else {
                                    c = {},
                                        s = a.status,
                                    "string" == typeof a.responseText && (c.text = a.responseText);
                                    try {
                                        l = a.statusText
                                    } catch (u) {
                                        l = ""
                                    }
                                    s || !e.isLocal || e.crossDomain ? 1223 === s && (s = 204) : s = c.text ? 200 : 404
                                }
                            c && i(s, l, c, a.getAllResponseHeaders())
                        }
                        ,
                        e.async ? 4 === a.readyState ? setTimeout(t) : a.onreadystatechange = Zn[r] = t : t()
                },
                abort: function() {
                    t && t(void 0, !0)
                }
            }
        }
    }),
        ot.ajaxSetup({
            accepts: {
                script: "text/javascript, application/javascript, application/ecmascript, application/x-ecmascript"
            },
            contents: {
                script: /(?:java|ecma)script/
            },
            converters: {
                "text script": function(e) {
                    return ot.globalEval(e),
                        e
                }
            }
        }),
        ot.ajaxPrefilter("script", function(e) {
            void 0 === e.cache && (e.cache = !1),
            e.crossDomain && (e.type = "GET",
                e.global = !1)
        }),
        ot.ajaxTransport("script", function(e) {
            if (e.crossDomain) {
                var t, n = ht.head || ot("head")[0] || ht.documentElement;
                return {
                    send: function(i, o) {
                        t = ht.createElement("script"),
                            t.async = !0,
                        e.scriptCharset && (t.charset = e.scriptCharset),
                            t.src = e.url,
                            t.onload = t.onreadystatechange = function(e, n) {
                                (n || !t.readyState || /loaded|complete/.test(t.readyState)) && (t.onload = t.onreadystatechange = null,
                                t.parentNode && t.parentNode.removeChild(t),
                                    t = null,
                                n || o(200, "success"))
                            }
                            ,
                            n.insertBefore(t, n.firstChild)
                    },
                    abort: function() {
                        t && t.onload(void 0, !0)
                    }
                }
            }
        });
    var ti = []
        , ni = /(=)\?(?=&|$)|\?\?/;
    ot.ajaxSetup({
        jsonp: "callback",
        jsonpCallback: function() {
            var e = ti.pop() || ot.expando + "_" + Mn++;
            return this[e] = !0,
                e
        }
    }),
        ot.ajaxPrefilter("json jsonp", function(t, n, i) {
            var o, a, r, s = t.jsonp !== !1 && (ni.test(t.url) ? "url" : "string" == typeof t.data && !(t.contentType || "").indexOf("application/x-www-form-urlencoded") && ni.test(t.data) && "data");
            return s || "jsonp" === t.dataTypes[0] ? (o = t.jsonpCallback = ot.isFunction(t.jsonpCallback) ? t.jsonpCallback() : t.jsonpCallback,
                s ? t[s] = t[s].replace(ni, "$1" + o) : t.jsonp !== !1 && (t.url += (An.test(t.url) ? "&" : "?") + t.jsonp + "=" + o),
                t.converters["script json"] = function() {
                    return r || ot.error(o + " was not called"),
                        r[0]
                }
                ,
                t.dataTypes[0] = "json",
                a = e[o],
                e[o] = function() {
                    r = arguments
                }
                ,
                i.always(function() {
                    e[o] = a,
                    t[o] && (t.jsonpCallback = n.jsonpCallback,
                        ti.push(o)),
                    r && ot.isFunction(a) && a(r[0]),
                        r = a = void 0
                }),
                "script") : void 0
        }),
        ot.parseHTML = function(e, t, n) {
            if (!e || "string" != typeof e)
                return null;
            "boolean" == typeof t && (n = t,
                t = !1),
                t = t || ht;
            var i = dt.exec(e)
                , o = !n && [];
            return i ? [t.createElement(i[1])] : (i = ot.buildFragment([e], t, o),
            o && o.length && ot(o).remove(),
                ot.merge([], i.childNodes))
        }
    ;
    var ii = ot.fn.load;
    ot.fn.load = function(e, t, n) {
        if ("string" != typeof e && ii)
            return ii.apply(this, arguments);
        var i, o, a, r = this, s = e.indexOf(" ");
        return s >= 0 && (i = ot.trim(e.slice(s, e.length)),
            e = e.slice(0, s)),
            ot.isFunction(t) ? (n = t,
                t = void 0) : t && "object" == typeof t && (a = "POST"),
        r.length > 0 && ot.ajax({
            url: e,
            type: a,
            dataType: "html",
            data: t
        }).done(function(e) {
            o = arguments,
                r.html(i ? ot("<div>").append(ot.parseHTML(e)).find(i) : e)
        }).complete(n && function(e, t) {
            r.each(n, o || [e.responseText, t, e])
        }
        ),
            this
    }
        ,
        ot.expr.filters.animated = function(e) {
            return ot.grep(ot.timers, function(t) {
                return e === t.elem
            }).length
        }
    ;
    var oi = e.document.documentElement;
    ot.offset = {
        setOffset: function(e, t, n) {
            var i, o, a, r, s, l, c, u = ot.css(e, "position"), d = ot(e), f = {};
            "static" === u && (e.style.position = "relative"),
                s = d.offset(),
                a = ot.css(e, "top"),
                l = ot.css(e, "left"),
                c = ("absolute" === u || "fixed" === u) && ot.inArray("auto", [a, l]) > -1,
                c ? (i = d.position(),
                    r = i.top,
                    o = i.left) : (r = parseFloat(a) || 0,
                    o = parseFloat(l) || 0),
            ot.isFunction(t) && (t = t.call(e, n, s)),
            null != t.top && (f.top = t.top - s.top + r),
            null != t.left && (f.left = t.left - s.left + o),
                "using"in t ? t.using.call(e, f) : d.css(f)
        }
    },
        ot.fn.extend({
            offset: function(e) {
                if (arguments.length)
                    return void 0 === e ? this : this.each(function(t) {
                        ot.offset.setOffset(this, e, t)
                    });
                var t, n, i = {
                    top: 0,
                    left: 0
                }, o = this[0], a = o && o.ownerDocument;
                if (a)
                    return t = a.documentElement,
                        ot.contains(t, o) ? (typeof o.getBoundingClientRect !== kt && (i = o.getBoundingClientRect()),
                            n = Y(a),
                            {
                                top: i.top + (n.pageYOffset || t.scrollTop) - (t.clientTop || 0),
                                left: i.left + (n.pageXOffset || t.scrollLeft) - (t.clientLeft || 0)
                            }) : i
            },
            position: function() {
                if (this[0]) {
                    var e, t, n = {
                        top: 0,
                        left: 0
                    }, i = this[0];
                    return "fixed" === ot.css(i, "position") ? t = i.getBoundingClientRect() : (e = this.offsetParent(),
                        t = this.offset(),
                    ot.nodeName(e[0], "html") || (n = e.offset()),
                        n.top += ot.css(e[0], "borderTopWidth", !0),
                        n.left += ot.css(e[0], "borderLeftWidth", !0)),
                        {
                            top: t.top - n.top - ot.css(i, "marginTop", !0),
                            left: t.left - n.left - ot.css(i, "marginLeft", !0)
                        }
                }
            },
            offsetParent: function() {
                return this.map(function() {
                    for (var e = this.offsetParent || oi; e && !ot.nodeName(e, "html") && "static" === ot.css(e, "position"); )
                        e = e.offsetParent;
                    return e || oi
                })
            }
        }),
        ot.each({
            scrollLeft: "pageXOffset",
            scrollTop: "pageYOffset"
        }, function(e, t) {
            var n = /Y/.test(t);
            ot.fn[e] = function(i) {
                return $t(this, function(e, i, o) {
                    var a = Y(e);
                    return void 0 === o ? a ? t in a ? a[t] : a.document.documentElement[i] : e[i] : (a ? a.scrollTo(n ? ot(a).scrollLeft() : o, n ? o : ot(a).scrollTop()) : e[i] = o,
                        void 0)
                }, e, i, arguments.length, null)
            }
        }),
        ot.each(["top", "left"], function(e, t) {
            ot.cssHooks[t] = N(nt.pixelPosition, function(e, n) {
                return n ? (n = tn(e, t),
                    on.test(n) ? ot(e).position()[t] + "px" : n) : void 0
            })
        }),
        ot.each({
            Height: "height",
            Width: "width"
        }, function(e, t) {
            ot.each({
                padding: "inner" + e,
                content: t,
                "": "outer" + e
            }, function(n, i) {
                ot.fn[i] = function(i, o) {
                    var a = arguments.length && (n || "boolean" != typeof i)
                        , r = n || (i === !0 || o === !0 ? "margin" : "border");
                    return $t(this, function(t, n, i) {
                        var o;
                        return ot.isWindow(t) ? t.document.documentElement["client" + e] : 9 === t.nodeType ? (o = t.documentElement,
                            Math.max(t.body["scroll" + e], o["scroll" + e], t.body["offset" + e], o["offset" + e], o["client" + e])) : void 0 === i ? ot.css(t, n, r) : ot.style(t, n, i, r)
                    }, t, a ? i : void 0, a, null)
                }
            })
        }),
        ot.fn.size = function() {
            return this.length
        }
        ,
        ot.fn.andSelf = ot.fn.addBack,
    "function" == typeof define && define.amd && define("jquery", [], function() {
        return ot
    });
    var ai = e.jQuery
        , ri = e.$;
    return ot.noConflict = function(t) {
        return e.$ === ot && (e.$ = ri),
        t && e.jQuery === ot && (e.jQuery = ai),
            ot
    }
        ,
    typeof t === kt && (e.jQuery = e.$ = ot),
        ot
});
var deviceIsAndroid = navigator.userAgent.indexOf("Android") > 0
    , deviceIsIOS = /iP(ad|hone|od)/.test(navigator.userAgent)
    , deviceIsIOS4 = deviceIsIOS && /OS 4_\d(_\d)?/.test(navigator.userAgent)
    , deviceIsIOSWithBadTarget = deviceIsIOS && /OS ([6-9]|\d{2})_\d/.test(navigator.userAgent);
FastClick.prototype.needsClick = function(e) {
    switch (e.nodeName.toLowerCase()) {
        case "button":
        case "select":
        case "textarea":
            if (e.disabled)
                return !0;
            break;
        case "input":
            if (deviceIsIOS && "file" === e.type || e.disabled)
                return !0;
            break;
        case "label":
        case "video":
            return !0
    }
    return /\bneedsclick\b/.test(e.className)
}
    ,
    FastClick.prototype.needsFocus = function(e) {
        switch (e.nodeName.toLowerCase()) {
            case "textarea":
                return !0;
            case "select":
                return !deviceIsAndroid;
            case "input":
                switch (e.type) {
                    case "button":
                    case "checkbox":
                    case "file":
                    case "image":
                    case "radio":
                    case "submit":
                        return !1
                }
                return !e.disabled && !e.readOnly;
            default:
                return /\bneedsfocus\b/.test(e.className)
        }
    }
    ,
    FastClick.prototype.sendClick = function(e, t) {
        var n, i;
        document.activeElement && document.activeElement !== e && document.activeElement.blur(),
            i = t.changedTouches[0],
            n = document.createEvent("MouseEvents"),
            n.initMouseEvent(this.determineEventType(e), !0, !0, window, 1, i.screenX, i.screenY, i.clientX, i.clientY, !1, !1, !1, !1, 0, null),
            n.forwardedTouchEvent = !0,
            e.dispatchEvent(n)
    }
    ,
    FastClick.prototype.determineEventType = function(e) {
        return deviceIsAndroid && "select" === e.tagName.toLowerCase() ? "mousedown" : "click"
    }
    ,
    FastClick.prototype.focus = function(e) {
        var t;
        deviceIsIOS && e.setSelectionRange && 0 !== e.type.indexOf("date") && "time" !== e.type ? (t = e.value.length,
            e.setSelectionRange(t, t)) : e.focus()
    }
    ,
    FastClick.prototype.updateScrollParent = function(e) {
        var t, n;
        if (t = e.fastClickScrollParent,
            !t || !t.contains(e)) {
            n = e;
            do {
                if (n.scrollHeight > n.offsetHeight) {
                    t = n,
                        e.fastClickScrollParent = n;
                    break
                }
                n = n.parentElement
            } while (n)
        }
        t && (t.fastClickLastScrollTop = t.scrollTop)
    }
    ,
    FastClick.prototype.getTargetElementFromEventTarget = function(e) {
        return e.nodeType === Node.TEXT_NODE ? e.parentNode : e
    }
    ,
    FastClick.prototype.onTouchStart = function(e) {
        var t, n, i;
        if (e.targetTouches.length > 1)
            return !0;
        if (t = this.getTargetElementFromEventTarget(e.target),
                n = e.targetTouches[0],
                deviceIsIOS) {
            if (i = window.getSelection(),
                i.rangeCount && !i.isCollapsed)
                return !0;
            if (!deviceIsIOS4) {
                if (n.identifier === this.lastTouchIdentifier)
                    return e.preventDefault(),
                        !1;
                this.lastTouchIdentifier = n.identifier,
                    this.updateScrollParent(t)
            }
        }
        return this.trackingClick = !0,
            this.trackingClickStart = e.timeStamp,
            this.targetElement = t,
            this.touchStartX = n.pageX,
            this.touchStartY = n.pageY,
        e.timeStamp - this.lastClickTime < this.tapDelay && e.preventDefault(),
            !0
    }
    ,
    FastClick.prototype.touchHasMoved = function(e) {
        var t = e.changedTouches[0]
            , n = this.touchBoundary;
        return Math.abs(t.pageX - this.touchStartX) > n || Math.abs(t.pageY - this.touchStartY) > n ? !0 : !1
    }
    ,
    FastClick.prototype.onTouchMove = function(e) {
        return this.trackingClick ? ((this.targetElement !== this.getTargetElementFromEventTarget(e.target) || this.touchHasMoved(e)) && (this.trackingClick = !1,
            this.targetElement = null),
            !0) : !0
    }
    ,
    FastClick.prototype.findControl = function(e) {
        return void 0 !== e.control ? e.control : e.htmlFor ? document.getElementById(e.htmlFor) : e.querySelector("button, input:not([type=hidden]), keygen, meter, output, progress, select, textarea")
    }
    ,
    FastClick.prototype.onTouchEnd = function(e) {
        var t, n, i, o, a, r = this.targetElement;
        if (!this.trackingClick)
            return !0;
        if (e.timeStamp - this.lastClickTime < this.tapDelay)
            return this.cancelNextClick = !0,
                !0;
        if (this.cancelNextClick = !1,
                this.lastClickTime = e.timeStamp,
                n = this.trackingClickStart,
                this.trackingClick = !1,
                this.trackingClickStart = 0,
            deviceIsIOSWithBadTarget && (a = e.changedTouches[0],
                r = document.elementFromPoint(a.pageX - window.pageXOffset, a.pageY - window.pageYOffset) || r,
                r.fastClickScrollParent = this.targetElement.fastClickScrollParent),
                i = r.tagName.toLowerCase(),
            "label" === i) {
            if (t = this.findControl(r)) {
                if (this.focus(r),
                        deviceIsAndroid)
                    return !1;
                r = t
            }
        } else if (this.needsFocus(r))
            return e.timeStamp - n > 100 || deviceIsIOS && window.top !== window && "input" === i ? (this.targetElement = null,
                !1) : (this.focus(r),
                this.sendClick(r, e),
            deviceIsIOS4 && "select" === i || (this.targetElement = null,
                e.preventDefault()),
                !1);
        return deviceIsIOS && !deviceIsIOS4 && (o = r.fastClickScrollParent,
        o && o.fastClickLastScrollTop !== o.scrollTop) ? !0 : (this.needsClick(r) || (e.preventDefault(),
            this.sendClick(r, e)),
            !1)
    }
    ,
    FastClick.prototype.onTouchCancel = function() {
        this.trackingClick = !1,
            this.targetElement = null
    }
    ,
    FastClick.prototype.onMouse = function(e) {
        return this.targetElement ? e.forwardedTouchEvent ? !0 : e.cancelable ? !this.needsClick(this.targetElement) || this.cancelNextClick ? (e.stopImmediatePropagation ? e.stopImmediatePropagation() : e.propagationStopped = !0,
            e.stopPropagation(),
            e.preventDefault(),
            !1) : !0 : !0 : !0
    }
    ,
    FastClick.prototype.onClick = function(e) {
        var t;
        return this.trackingClick ? (this.targetElement = null,
            this.trackingClick = !1,
            !0) : "submit" === e.target.type && 0 === e.detail ? !0 : (t = this.onMouse(e),
        t || (this.targetElement = null),
            t)
    }
    ,
    FastClick.prototype.destroy = function() {
        var e = this.layer;
        deviceIsAndroid && (e.removeEventListener("mouseover", this.onMouse, !0),
            e.removeEventListener("mousedown", this.onMouse, !0),
            e.removeEventListener("mouseup", this.onMouse, !0)),
            e.removeEventListener("click", this.onClick, !0),
            e.removeEventListener("touchstart", this.onTouchStart, !1),
            e.removeEventListener("touchmove", this.onTouchMove, !1),
            e.removeEventListener("touchend", this.onTouchEnd, !1),
            e.removeEventListener("touchcancel", this.onTouchCancel, !1)
    }
    ,
    FastClick.notNeeded = function(e) {
        var t, n;
        if ("undefined" == typeof window.ontouchstart)
            return !0;
        if (n = +(/Chrome\/([0-9]+)/.exec(navigator.userAgent) || [, 0])[1]) {
            if (!deviceIsAndroid)
                return !0;
            if (t = document.querySelector("meta[name=viewport]")) {
                if (-1 !== t.content.indexOf("user-scalable=no"))
                    return !0;
                if (n > 31 && window.innerWidth <= window.screen.width)
                    return !0
            }
        }
        return "none" === e.style.msTouchAction ? !0 : !1
    }
    ,
    FastClick.attach = function(e, t) {
        return new FastClick(e,t)
    }
    ,
    "undefined" != typeof define && define.amd ? define(function() {
        return FastClick
    }) : "undefined" != typeof module && module.exports ? (module.exports = FastClick.attach,
        module.exports.FastClick = FastClick) : window.FastClick = FastClick;
var navno = navno || {};
$(function() {
    var e = $("#driftsmelding")
        , t = e.data("url")
        , n = null
        , i = !1;
    t && $.ajax({
        type: "GET",
        url: t.concat("/Melding?reset=").concat(Math.ceil(5120 * Math.random()) + 1024 * Math.random() + 10),
        success: function(e) {
            n = $.parseHTML(e),
                i = 0 === $(n).find("#services-ok").length
        },
        complete: function() {
            i ? (e.removeAttr("data-url").find("span").remove(),
                e.append($(n).find("section")).slideDown(800)) : $(".service-notification").remove()
        }
    })
}),
    $(function() {
        $(".site-coltrols-toolbar ul li.dropdown").click(function() {
            var e = $(this).find("ul.dropdown-menu");
            e.hasClass("hidden") ? e.removeClass("hidden") : e.addClass("hidden")
        })
    }),
    navno.handleDocClickTouch = function(e) {
        var t = $(".content-languages")
            , n = $(".site-coltrols-toolbar ul li.dropdown")
            , i = $(".mobile-linklist-related")
            , o = $("aside.related-content.accordion");
        if (t.length > 0 && 0 === t.has(e.target).length && t.hasClass("selected") && (t.find("ul").addClass("hide"),
                t.removeClass("selected")),
            0 !== n.has(e.target).length || n.find("ul.dropdown-menu").hasClass("hidden") || n.find("ul.dropdown-menu").addClass("hidden"),
            i.length > 0 && 0 === i.has(e.target).length && i.hasClass("open") && navno.touchMovedOnArticle === !1) {
            i.toggleClass("open");
            var a = i.find("nav");
            a.css("height", 0),
                setTimeout(function() {
                    i.hasClass("open") ? (a.prev().find("a").attr("aria-expanded", !0).attr("aria-hidden", !1),
                        a.attr("aria-expanded", !0).attr("aria-hidden", !1)) : (a.prev().find("a").attr("aria-expanded", !1).attr("aria-hidden", !0),
                        a.attr("aria-expanded", !1).attr("aria-hidden", !0))
                }, 400)
        }
        if (o.length > 0) {
            var r = o.find(".expanded .accordion-panel");
            r.length > 0 && 0 === o.has(e.target).length && (r.height("0"),
                setTimeout(function() {
                    r.attr("aria-expanded", !1).attr("aria-hidden", !0).removeAttr("style").parent().removeClass("expanded js-animated").find("header a").attr("aria-expanded", !1).attr("aria-hidden", !0)
                }, 250))
        }
    }
    ,
    $(function() {
        var e = "ontouchstart"in document.documentElement;
        $(document).on("click touchend", function(t) {
            e && "touchend" === t.type ? navno.handleDocClickTouch(t) : navno.handleDocClickTouch(t)
        })
    }),
    $(function() {
        $("a[href*='//tjenester.nav.no'][class='hero-link']").on("click", function(e) {
            if ("undefined" != typeof ga && ga.hasOwnProperty("loaded") && ga.loaded === !0) {
                e.preventDefault();
                var t = $(this).attr("href");
                ga("send", "event", "Forsideboks", "klikk", $(this).attr("title"), {
                    hitCallback: function() {
                        window.location = t
                    }
                })
            }
        }),
            $("a[rel='external']").on("click", function() {
                return window.open($(this).attr("href")),
                    !1
            })
    }),
    $(function() {
        $("#text-size-accessibility").on("mouseenter focusin", function() {
            $(this).find(".hidden").removeClass("hidden")
        }).on("mouseleave focusout", function() {
            $(this).find(".text-size-tooltip").addClass("hidden")
        }).on("click", function(e) {
            e.preventDefault()
        })
    }),
    $(function() {
        $(".siteheader .dropdown-toggle").on("focusin", function() {
            $(this).addClass("page-languages")
        }).on("focusout", function() {
            $(this).removeClass("page-languages")
        })
    }),
    $(function() {
        if (shouldShowLoginInfo()) {
            var e = $(".logout-tooltip");
            $lukk = e.find(".lukk"),
                $lukk.removeClass("hidden"),
                e.removeClass("hidden").delay(3e3).fadeOut("slow", function() {
                    e.addClass("hidden").show(),
                        $lukk.addClass("hidden")
                }),
                Innloggingslinje.setCookie(Innloggingslinje.LOGIN_TOOLTIP_HAS_BEEN_SHOWN, "1", 30),
                Innloggingslinje.deleteCookie(Innloggingslinje.SHOULD_SHOW_LOGIN_TOOLTIP)
        }
    }),
    $(function() {
        $(".logout-tooltip .lukk").on("click", function() {
            $(".logout-tooltip").addClass("hidden"),
                $(".logout-tooltip .lukk").addClass("hidden")
        })
    }),
    $(function() {
        $("#logout, #logout-mobil").on("click", function(e) {
            e.preventDefault(),
                Innloggingslinje.deleteCookie(Innloggingslinje.LOGIN_TOOLTIP_HAS_BEEN_SHOWN),
                window.location = $(this).attr("href")
        })
    }),
    $(function() {
        var e = $(".logout-tooltip");
        $("#login-details span").first().on("mouseenter focusin", function() {
            e.removeClass("hidden")
        }).on("mouseleave focusout", function() {
            e.addClass("hidden")
        })
    }),
    $(function() {
        var e = $(".login-tooltip");
        $("#login").first().on("mouseenter focusin", function() {
            e.removeClass("hidden")
        }).on("mouseleave focusout", function() {
            e.addClass("hidden")
        })
    }),
    navno.setCookie = function(e, t, n, i) {
        var o = new Date;
        o.setDate(o.getDate() + n);
        var a;
        a = i ? escape(t) + (null == n ? "" : ";domain=.nav.no;path=/;made_write_conn=1295214458;") : escape(t) + (null == n ? "" : "; expires=" + o.toUTCString() + ";domain=.nav.no;path=/;"),
            document.cookie = e + "=" + a
    }
    ,
    navno.getCookie = function(e) {
        var t = document.cookie
            , n = t.indexOf(" " + e + "=")
            , n = -1 === n ? t.indexOf(e + "=") : n;
        if (-1 === n)
            t = null;
        else {
            n = t.indexOf("=", n) + 1;
            var i = t.indexOf(";", n);
            -1 === i && (i = t.length),
                t = unescape(t.substring(n, i))
        }
        return t
    }
    ,
    $(function() {
        var e = $("#high-contrast")
            , t = $("body")
            , n = navno.getCookie("highContrast");
        "1" === n && t.addClass("contrast");
        var i = function(e) {
            e.preventDefault(),
                t.hasClass("contrast") ? t.hasClass("contrast") && (navno.setCookie("highContrast", 0, 7, !1),
                    t.removeClass("contrast")) : (navno.setCookie("highContrast", 1, 7, !1),
                    t.addClass("contrast"))
        };
        e.on("click", i)
    }),
    $(function() {
        "undefined" != typeof ga && ga.hasOwnProperty("loaded") && ga.loaded === !0 && ($(".visuallyhidden.focusable").eq(0).one("focus.google-analytics", function() {
            ga("send", "event", "Tastatur", "focus", $(this).text())
        }),
            $("#high-contrast").find("button").on("click.google-analytics", function() {
                var e = "";
                e = $("body").hasClass("contrast") ? "av" : "på",
                    ga("send", "event", "Høykontrast " + e, "klikk", $(this).text())
            }),
            $(".carousel-control").on("click.google-analytics", function() {
                ga("send", "event", "Karusell", "klikk", "Høyre/venstre")
            }),
            $(".carousel-dropdown").find(".btn").on("click.google-analytics", function() {
                ga("send", "event", "Karusell", "klikk", "Se alle")
            }),
            $("#play-btn").one("click.google-analytics", function() {
                var e = $("#pagecontent").find("h1").eq(0).text() || document.title;
                ga("send", "event", "Talesyntese", "Play", e)
            }),
            $("#text-size-accessibility").on("click.google-analytics", function() {
                ga("send", "event", "Header", "klikk", "Skriftstorrelse")
            }))
    }),
    $(function() {
        if (window.addEventListener && $("#footer-content-menu").length > 0) {
            var e, t = $(".letter-scroll-left"), n = $(".letter-scroll-right"), i = $("#footer-content-menu");
            t.click(function(e) {
                e.preventDefault(),
                    i.animate({
                        scrollLeft: "-=120"
                    }, 300)
            }),
                n.click(function(e) {
                    e.preventDefault(),
                        i.animate({
                            scrollLeft: "+=120"
                        }, 300)
                });
            for (var o = new Array("mousedown","touchstart"), a = new Array("touchleave","touchcancel","touchend"), r = 0; 2 > r; r++)
                t[0].addEventListener(o[r], function() {
                    e = setInterval(function() {
                        i.animate({
                            scrollLeft: "-=120"
                        }, 300)
                    }, 300)
                }),
                    n[0].addEventListener(o[r], function() {
                        e = setInterval(function() {
                            i.animate({
                                scrollLeft: "+=120"
                            }, 300)
                        }, 300)
                    });
            for (var r = 0; 3 > r; r++)
                t[0].addEventListener(a[r], function() {
                    return clearInterval(e),
                        !1
                }),
                    n[0].addEventListener(a[r], function() {
                        return clearInterval(e),
                            !1
                    });
            $(t).add(n).on("mouseup mouseout mouseleave", function() {
                return clearInterval(e),
                    !1
            })
        }
    }),
    navno.buttonBottomOffset = null,
    navno.topLinkButtonPlaceholder = null,
    navno.topLinkStickyElement = null,
    navno.requiredScrollDistanceForSticky = null,
    navno.onScrollAndResize = function() {
        var e = $(document).scrollTop() + $(window).height()
            , t = $(document).scrollTop() > navno.requiredScrollDistanceForSticky;
        t && navno.buttonBottomOffset > e && !navno.topLinkStickyElement.hasClass("sticky-top-link") ? navno.topLinkStickyElement.addClass("sticky-top-link") : t && navno.buttonBottomOffset < e && navno.topLinkStickyElement.hasClass("sticky-top-link") ? navno.topLinkStickyElement.removeClass("sticky-top-link") : !t && navno.topLinkStickyElement.hasClass("sticky-top-link") && navno.topLinkStickyElement.removeClass("sticky-top-link")
    }
    ,
    $(function() {
        $(".placeholder").length > 0 && scrollToTopHandler()
    }),
    $(function() {
        $("#top-scroll-link").on("click", function(e) {
            e.preventDefault();
            var t = $("#page-top");
            $("html, body").animate({
                scrollTop: t.offset().top
            }, {
                duration: 250
            }),
                t.attr("tabindex", "-1").focus()
        })
    }),
    $(function() {
        var e = $(".error-container")
            , t = !1;
        e.length > 0 && (document.referrer.length > 0 ? e.find(".btn").attr("href", document.referrer) : e.find(".btn").on("click touchend", function(e) {
            e.preventDefault(),
            t === !1 && (t = !0,
                window.history.back())
        }))
    }),
    $(function() {
        "undefined" == typeof navno.securityLevel ? hideDittNavMenuSetLogin() : (setLockedClassOnInaccessibleMenuElements(),
            setCorrectSecLevelUpgradeInfoText(navno.securityLevel))
    }),
    $(function() {
        $("li.topnavitem").each(function() {
            var e = 0
                , t = $(this).find("h2.globalmenu-tittel");
            t.each(function() {
                e = Math.max($(this).height(), e)
            }),
                t.each(function() {
                    $(this).height(e)
                })
        })
    }),
    $(function() {
        $("#globalmenu-upgrade-info-button").click(function() {
            var e = $("#globalmenu-upgrade-info-tooltip")[0]
                , t = $("#globalmenu-upgrade-info-button").offset()
                , n = t.left - $(e).width() + 21
                , i = t.top - $(e).height() - 34;
            $(e).offset({
                top: i,
                left: n
            })
        })
    }),
    $(function() {
        $("nav.table-of-contents li a").click(function(e) {
            var t = $(this);
            e.preventDefault(),
                navno.scrollToId(t)
        })
    }),
    navno.scrollToId = function(e) {
        var t = e.attr("href")
            , n = t.substring(t.lastIndexOf("#"));
        $("html, body").animate({
            scrollTop: $(n).offset().top - 25
        }, {
            duration: 1e3,
            complete: function() {
                var e = $("nav.table-of-contents")
                    , t = e.attr("data-selected-id");
                "" !== t && $(t).removeClass("selected"),
                    e.attr("data-selected-id", n),
                    window.setTimeout(function() {
                        $(n)[0].focus(),
                            history && history.pushState ? history.pushState(null, null, n) : window.location.href = n
                    }, 0),
                    setTimeout(function() {
                        $(n).addClass("selected")
                    }, 800)
            }
        })
    }
    ,
    navno.beforeContentPrint = function() {
        var e = $("#print-url").text()
            , t = !1;
        $.ajax({
            type: "GET",
            url: e,
            success: function(e) {
                t = !0;
                var n = $.parseHTML(e)
                    , i = $("#pagecontent")
                    , o = i.find("section")
                    , a = $(n).find("section")
                    , r = navno.getSelectedChapterIndex();
                if (0 === r)
                    o.addClass("hide"),
                        $(a).each(function() {
                            i.append(a)
                        });
                else {
                    var s = i.parent()
                        , i = $(n).find("article");
                    $("#pagecontent").addClass("hide"),
                        s.append(i)
                }
            },
            complete: function() {
                1 == t && setTimeout(function() {
                    t = !1,
                        window.print()
                }, 200)
            }
        })
    }
    ,
    navno.afterContentPrint = function() {
        if ($("#print-all").hasClass("selected")) {
            $("#print-all").removeClass("selected");
            var e = navno.getSelectedChapterIndex();
            if (0 === e) {
                var t = $("#pagecontent")
                    , n = t.find("section");
                n.each(function(e) {
                    var t = $(this);
                    e > 0 ? t.remove() : t.removeClass("hide")
                }),
                    t.find("header").removeClass("hide"),
                    t.find(".article-body").removeClass("hide")
            } else
                $("article").last().remove(),
                    $("article.hide").removeClass("hide")
        } else
            $("#print-page").hasClass("selected") && $("#print-page").removeClass("selected")
    }
    ,
    navno.getSelectedChapterIndex = function() {
        var e = $(".content-submenu")
            , t = e.find("a.selected")
            , n = -1;
        if (t.length > 0) {
            var i = t.parent();
            n = e.find("li").index(i)
        }
        return n
    }
    ,
    navno.initContentPrintHandler = function() {
        if ($(".toolbar").length > 0) {
            var e = $("#print-page");
            e.length > 0 && (e.on("click", function() {
                $(this).addClass("selected"),
                    window.print()
            }),
                e[0].addEventListener("keypress", function(e) {
                    var t = e.which || e.keyCode;
                    13 === t && window.print()
                })),
            $("#print-all").length > 0 && ($("#print-all").on("click", function() {
                $(this).addClass("selected"),
                    navno.beforeContentPrint()
            }),
                $("#print-all")[0].addEventListener("keypress", function(e) {
                    var t = e.which || e.keyCode;
                    13 === t && ($(this).addClass("selected"),
                        navno.beforeContentPrint())
                }))
        }
    }
    ,
    $(function() {
        var e = !1
            , t = function() {
            setTimeout(function() {
                navno.afterContentPrint()
            }, 400)
        };
        if (window.onafterprint = t,
                window.matchMedia) {
            var n = window.matchMedia("print");
            n.addListener(function(t) {
                0 == e && (t.matches || (e = !0,
                    setTimeout(function() {
                        e = !1,
                            navno.afterContentPrint()
                    }, 400)))
            })
        }
    }),
    $(function() {
        navno.initContentPrintHandler()
    }),
    $(function() {
        if (null !== document.getElementById("nav-nvv")) {
            var e = "nav-veiviser"
                , t = "[\\?&]" + e + "=([^&#]*)"
                , n = new RegExp(t)
                , i = n.exec(document.URL);
            if (null !== i && !isNaN(i[1]) && i[1].length < 12)
                setCookie(e, i[1], 1, !0),
                    navno.setVVLink(i[1]);
            else {
                var o = navno.getCookie(e);
                null === o || isNaN(o) || navno.setVVLink(o)
            }
        }
    }),
    navno.setVVLink = function(e) {
        var t = document.getElementById("nav-nvv");
        t.href = "https://www.nav.no/workinnorway/page?id=" + e
    }
    ,
    navno.initMap = function() {
        var e = document.getElementById("office-map")
            , t = e.getAttribute("data-latlng")
            , n = t.indexOf(",")
            , i = new google.maps.LatLng(t.substr(0, n).trim(),t.substr(n + 1, t.length).trim())
            , o = [{
            stylers: [{
                hue: "#3E3832"
            }, {
                weight: 1.2
            }, {
                saturation: -90
            }, {
                gamma: .7
            }]
        }]
            , a = {
            center: i,
            zoom: 15,
            mapTypeId: google.maps.MapTypeId.ROADMAP,
            clickable: !1
        }
            , r = new google.maps.Map(e,a);
        new google.maps.Marker({
            position: i,
            map: r,
            icon: "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4NCjwhLS0gR2VuZXJhdG9yOiBBZG9iZSBJbGx1c3RyYXRvciAxNy4wLjAsIFNWRyBFeHBvcnQgUGx1Zy1JbiAuIFNWRyBWZXJzaW9uOiA2LjAwIEJ1aWxkIDApICAtLT4NCjwhRE9DVFlQRSBzdmcgUFVCTElDICItLy9XM0MvL0RURCBTVkcgMS4xLy9FTiIgImh0dHA6Ly93d3cudzMub3JnL0dyYXBoaWNzL1NWRy8xLjEvRFREL3N2ZzExLmR0ZCI+DQo8c3ZnIHZlcnNpb249IjEuMSIgaWQ9Imxva2FsdCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgeD0iMHB4IiB5PSIwcHgiDQoJIHdpZHRoPSIyOS4zODRweCIgaGVpZ2h0PSI1MHB4IiB2aWV3Qm94PSIwLjk5OCAtNi4xODkgMjkuMzg0IDUwIiBlbmFibGUtYmFja2dyb3VuZD0ibmV3IDAuOTk4IC02LjE4OSAyOS4zODQgNTAiDQoJIHhtbDpzcGFjZT0icHJlc2VydmUiPg0KPHBhdGggZmlsbD0iI0MzMDAwMCIgZD0iTTMwLjM4Myw4LjUwM2MwLTguMTE1LTYuNTc3LTE0LjY5Mi0xNC42OTItMTQuNjkyQzcuNTc2LTYuMTg5LDAuOTk4LDAuMzksMC45OTgsOC41MDMNCgljMCwyLjExNiwwLjQ4Nyw0LjEwNSwxLjI5Myw1LjkyM0gyLjI0M0wxNS42OSw0My44MTFsMTMuNDQ1LTI5LjM4NWgtMC4wMThDMjkuOTIsMTIuNjEyLDMwLjM4MywxMC42MTUsMzAuMzgzLDguNTAzeiBNMTUuNzMsMTMuMDk5DQoJYy0yLjA3NywwLTMuNzYxLTEuNjg0LTMuNzYxLTMuNzYxczEuNjg0LTMuNzYxLDMuNzYxLTMuNzYxczMuNzYxLDEuNjg0LDMuNzYxLDMuNzYxUzE3LjgwNywxMy4wOTksMTUuNzMsMTMuMDk5eiIvPg0KPC9zdmc+DQo= ",
            title: e.getAttribute("data-marker-title")
        }),
            r.setOptions({
                styles: o
            })
    }
    ,
    $(function() {
        if ($("#office-map").length > 0) {
            var e = document.createElement("script");
            e.type = "text/javascript",
                e.src = "https://maps.googleapis.com/maps/api/js?key=AIzaSyDKiZHl59dNmJJwQhfi0YH5AtrrMkzDtqQ&sensor=false&callback=navno.initMap",
                document.body.appendChild(e)
        }
    }),
    navno.onClickEnterContentLanguage = function(e) {
        var t = function(t) {
            var n = $(".content-languages");
            if ("undefined" != typeof t) {
                t.stopPropagation();
                var i = $("header.siteheader ul.dropdown-menu");
                i.hasClass("hidden") || i.addClass("hidden")
            }
            n.hasClass("selected") ? (e.addClass("hide"),
                n.removeClass("selected")) : (n.addClass("selected"),
                e.removeClass("hide"))
        };
        return t
    }
    ,
    navno.contentLanguages = function() {
        var e = $(".content-languages");
        if (e.length > 0) {
            var t = e.find("ul");
            e.on("click", navno.onClickEnterContentLanguage(t, e)),
                e.on("keyup", function(n) {
                    var i = n.which || n.keyCode;
                    13 === i && (e.hasClass("selected") ? (t.addClass("hide"),
                        e.removeClass("selected")) : (e.addClass("selected"),
                        t.removeClass("hide")))
                })
        }
    }
    ,
    $(function() {
        navno.contentLanguages()
    }),
    navno.initSpeechSynthesisButtons = function() {
        var e = $("#play-btn");
        e.length > 0 && (e.click(function(e) {
            e.preventDefault(),
            $(this).hasClass("play") || $(this).addClass("play");
            var t = window.getSelection();
            if ("undefined" != typeof t && t.toString().length > 0 || "undefined" != typeof document.selection && document.selection.toString().length > 0)
                vFact_doplay();
            else {
                var n = $("#pagecontent")
                    , i = n.find(".toolbar")
                    , o = n.find("time.pubdate");
                $(".content-languages"),
                    $("#pagecontent .toolbar").remove(),
                    $("#pagecontent time.pubdate").remove(),
                    vFact_playsection("pagecontent"),
                    i.insertAfter("#pagecontent > header > h1"),
                    o.insertBefore("#pagecontent > header > h1"),
                $(".content-languages").length > 0 && navno.contentLanguages(),
                    navno.initTextToSpeechPanel(),
                    navno.initSpeechSynthesisButtons(),
                $("#print-page").length > 0 && navno.initContentPrintHandler()
            }
        }),
            $(".tts-stop").click(function(e) {
                e.preventDefault(),
                $(".tts-play").hasClass("play") && ($("#tts-group .tts-play").removeClass("play"),
                    vFact_dostop())
            }))
    }
    ,
    navno.initTextToSpeechPanel = function() {
        var e = $(".tts-panel")
            , t = e.find("button.tts-btn-listen")
            , n = t.width() + 36
            , i = "https://speech.leseweb.dk/script/ke857rosk1l7q9llcd0u.js";
        t.click(function() {
            var t = $("#tts-group");
            t.css("left", n + "px");
            var o = $(this);
            t.hasClass("hide") ? (o.hasClass("tts-btn-collapsed") && o.removeClass("tts-btn-collapsed"),
                o.addClass("tts-btn-expanded"),
                t.removeClass("hide"),
                e.animate({
                    width: n + 119 + "px"
                }, {
                    duration: "slow",
                    complete: function() {
                        var t = e.attr("data-scriptenabled");
                        "false" === t && ($.getScript(i).done(function() {
                            navno.initSpeechSynthesisButtons()
                        }).fail(function() {}),
                            e.attr("data-scriptenabled", "true"))
                    }
                })) : e.animate({
                width: n + "px"
            }, {
                duration: "slow",
                complete: function() {
                    o.addClass("tts-btn-collapsed"),
                        o.removeClass("tts-btn-expanded"),
                        t.addClass("hide")
                }
            })
        })
    }
    ,
    $(function() {
        navno.initTextToSpeechPanel()
    }),
    $(function() {
        var e = $("#accordion-rates");
        if (e.length > 0) {
            var t = e.find("a").first()
                , n = !1
                , i = null;
            $.ajax({
                type: "GET",
                url: t.attr("data-full-url"),
                success: function(e) {
                    i = $.parseHTML(e),
                        n = !0
                },
                complete: function() {
                    if (n) {
                        var e = $(i).find("a").attr("href");
                        null != e && e.length > 0 && t.attr("href", e)
                    }
                }
            })
        }
    }),
    navno.touchMovedOnArticle = !1,
    $(function() {
        var e = $("#pagecontent .mobile-linklist-related");
        if (e.length > 0) {
            var t = e.find("nav.init");
            t.css("height", 0);
            var n = t.find("ul").height() + 65;
            t.removeClass("init");
            var i, o;
            $("#pagecontent").on("touchstart", function(e) {
                var t = e.originalEvent.targetTouches ? e.originalEvent.targetTouches[0] : e;
                navno.touchMovedOnArticle = !1,
                    i = t.clientX,
                    o = t.clientY
            }),
                $("#pagecontent").on("touchmove", function(e) {
                    var t = e.originalEvent.targetTouches ? e.originalEvent.targetTouches[0] : e;
                    (Math.abs(t.clientX - i) > 10 || Math.abs(t.clientY - o) > 10) && (navno.touchMovedOnArticle = !0)
                }),
                e.find(".submenu-header a").on("touchstart touchend", function(i) {
                    if (i.preventDefault(),
                        "touchend" !== i.type || navno.touchMovedOnArticle)
                        "touchstart" === i.type && (navno.touchMovedOnArticle = !1);
                    else {
                        var o = $(this)
                            , a = e.hasClass("open") ? 0 : n;
                        e.toggleClass("open"),
                            t.css("height", a),
                            setTimeout(function() {
                                e.hasClass("open") ? (o.attr("aria-expanded", !0).attr("aria-hidden", !1),
                                    t.attr("aria-expanded", !0).attr("aria-hidden", !1)) : (o.attr("aria-expanded", !1).attr("aria-hidden", !0),
                                    t.attr("aria-expanded", !1).attr("aria-hidden", !0)),
                                    navno.buttonBottomOffset = navno.topLinkButtonPlaceholder.offset().top + navno.topLinkButtonPlaceholder.height(),
                                    navno.onScrollAndResize();
                                var n = $(window).height() + $(window).scrollTop()
                                    , i = o.parent().offset().top + o.parent().height();
                                i > n && $("html, body").animate({
                                    scrollTop: $(window).scrollTop() + 120
                                }, {
                                    duration: 200,
                                    complete: function() {}
                                })
                            }, 420)
                    }
                })
        }
    }),
    $(function() {
        var e = document.title.replace(" - www.nav.no", "")
            , t = "nav.no"
            , n = window.location.href
            , i = {
            facebook: "http://www.facebook.com/sharer/sharer.php?u=" + n + "&title=" + encodeURIComponent(e),
            twitter: "http://twitter.com/intent/tweet?text=" + encodeURIComponent(e) + ": " + n,
            linkedin: "http://www.linkedin.com/shareArticle?mini=true&url=" + n + "&title=" + encodeURIComponent(e) + "&source=" + t
        }
            , o = function(e) {
            e && e.preventDefault && e.preventDefault();
            var t = document.documentElement.clientWidth
                , n = document.documentElement.clientHeight
                , i = 575
                , o = 400
                , a = (t - i) / 2
                , r = (n - o) / 2
                , s = this.href
                , l = (this.innerHTML,
            "status=1,width=" + i + ",height=" + o + ",top=" + r + ",left=" + a);
            window.open(s, "", l)
        };
        $(".js-share").each(function() {
            var e = $(this).data("medium")
                , t = i[e];
            $(this).attr("href", t),
                $(this).on("click", o)
        })
    });
var navno = window.navno || {};
$.fn.navnoAccordion = function() {
    var e, t, n = 0;
    return e = function(e) {
        e = $(e),
        e.attr("id") || e.attr("id", "accordion-" + (new Date).getTime() + "-" + ++n)
    }
        ,
        t = function(e) {
            var t = $(e.target)
                , n = t.closest(".accordion-item")
                , i = n.find("ul").height() + 30;
            n.siblings().removeClass("expanded js-animated").find(".accordion-panel").css("height", "").parent().find("[aria-expanded]").attr("aria-expanded", "false").attr("aria-hidden", "true"),
                n.hasClass("expanded") ? (n.removeClass("expanded").find(".accordion-panel").css("height", "").parent().find("[aria-expanded]").attr("aria-expanded", "false").attr("aria-hidden", "true"),
                    setTimeout(function() {
                        n.removeClass("js-animated")
                    }, 200)) : n.addClass("expanded js-animated").find(".accordion-panel").css("height", i).parent().find("[aria-expanded]").attr("aria-expanded", "true").attr("aria-hidden", "false")
        }
        ,
        this.each(function() {
            var n = $(this)
                , i = n.children();
            i.each(function(t, n) {
                var i = $(n)
                    , o = i.find(".accordion-panel")
                    , a = i.find(".accordion-toggle");
                e(o),
                    e(a),
                    a.attr({
                        "aria-haspopup": !0,
                        "aria-owns": o.attr("id"),
                        "aria-controls": o.attr("id"),
                        "aria-expanded": !1
                    }),
                    o.attr({
                        role: "group",
                        "aria-expanded": !1,
                        "aria-hidden": !0
                    }).not("[aria-labelledby]").attr("aria-labelledby", a.attr("id"))
            }),
                $(".accordion-toggle").on("click", function(e) {
                    e.preventDefault(),
                        t(e)
                })
        })
}
    ,
    $(document).ready(function() {
        $("#related-content-accordion").navnoAccordion(),
            $(".valgForSkjemasok").navnoAccordion()
    }),
window.matchMedia || (window.matchMedia = function() {
    "use strict";
    var e = window.styleMedia || window.media;
    if (!e) {
        var t = document.createElement("style")
            , n = document.getElementsByTagName("script")[0]
            , i = null;
        t.type = "text/css",
            t.id = "matchmediajs-test",
            n.parentNode.insertBefore(t, n),
            i = "getComputedStyle"in window && window.getComputedStyle(t, null) || t.currentStyle,
            e = {
                matchMedium: function(e) {
                    var n = "@media " + e + "{ #matchmediajs-test { width: 1px; } }";
                    return t.styleSheet ? t.styleSheet.cssText = n : t.textContent = n,
                    "1px" === i.width
                }
            }
    }
    return function(t) {
        return {
            matches: e.matchMedium(t || "all"),
            media: t || "all"
        }
    }
}()),
    function() {
        if (window.matchMedia && window.matchMedia("all").addListener)
            return !1;
        var e = window.matchMedia
            , t = e("only all").matches
            , n = !1
            , i = 0
            , o = []
            , a = function() {
            clearTimeout(i),
                i = setTimeout(function() {
                    for (var t = 0, n = o.length; n > t; t++) {
                        var i = o[t].mql
                            , a = o[t].listeners || []
                            , r = e(i.media).matches;
                        if (r !== i.matches) {
                            i.matches = r;
                            for (var s = 0, l = a.length; l > s; s++)
                                a[s].call(window, i)
                        }
                    }
                }, 30)
        };
        window.matchMedia = function(i) {
            var r = e(i)
                , s = []
                , l = 0;
            return r.addListener = function(e) {
                t && (n || (n = !0,
                    window.addEventListener("resize", a, !0)),
                0 === l && (l = o.push({
                    mql: r,
                    listeners: s
                })),
                    s.push(e))
            }
                ,
                r.removeListener = function(e) {
                    for (var t = 0, n = s.length; n > t; t++)
                        s[t] === e && s.splice(t, 1)
                }
                ,
                r
        }
    }(),
    $(document).ready(function() {
        !function(e, t, n) {
            "use strict";
            function i(t, n) {
                this.element = t,
                    this.settings = e.extend({}, c, n),
                    this._defaults = c,
                    this._name = l,
                    this.init()
            }
            function o(t) {
                return e.expr.filters.visible(t) && !e(t).parents().addBack().filter(function() {
                    return "hidden" === e.css(this, "visibility")
                }).length
            }
            function a(t, n) {
                var i, a, r, s = t.nodeName.toLowerCase();
                return "area" === s ? (i = t.parentNode,
                    a = i.name,
                    t.href && a && "map" === i.nodeName.toLowerCase() ? (r = e("img[usemap=#" + a + "]")[0],
                    !!r && o(r)) : !1) : (/input|select|textarea|button|object/.test(s) ? !t.disabled : "a" === s ? t.href || n : n) && o(t)
            }
            function r() {
                var t = e("#globalmenu-upgrade-info-tooltip");
                void 0 === t || t.hasClass("hidden") || t.addClass("hidden")
            }
            function s(t) {
                var n = e("#globalmenu-upgrade-info-tooltip");
                if (null === n || n.hasClass("hidden"))
                    return !1;
                var i = t.attr("id");
                return void 0 !== i && -1 !== i.indexOf("globalmenu-upgrade-info-close") ? !0 : !1
            }
            var l = "accessibleMegaMenu"
                , c = {
                uuidPrefix: "accessible-megamenu",
                menuClass: "accessible-megamenu",
                topNavItemClass: "topnavitem",
                panelClass: "accessible-megamenu-panel",
                panelGroupClass: "accessible-megamenu-panel-group",
                hoverClass: "hover",
                focusClass: "focus",
                openClass: "open",
                selectedTopNavItem: "selected-topnavitem",
                jsAnimatedClass: "js-animated",
                jsMenuExpandedClass: "js-menu-expanded",
                enableMobileMenu: !1
            }
                , u = {
                BACKSPACE: 8,
                COMMA: 188,
                DELETE: 46,
                DOWN: 40,
                END: 35,
                ENTER: 13,
                ESCAPE: 27,
                HOME: 36,
                LEFT: 37,
                PAGE_DOWN: 34,
                PAGE_UP: 33,
                PERIOD: 190,
                RIGHT: 39,
                SPACE: 32,
                TAB: 9,
                UP: 38,
                keyMap: {
                    48: "0",
                    49: "1",
                    50: "2",
                    51: "3",
                    52: "4",
                    53: "5",
                    54: "6",
                    55: "7",
                    56: "8",
                    57: "9",
                    59: ";",
                    65: "a",
                    66: "b",
                    67: "c",
                    68: "d",
                    69: "e",
                    70: "f",
                    71: "g",
                    72: "h",
                    73: "i",
                    74: "j",
                    75: "k",
                    76: "l",
                    77: "m",
                    78: "n",
                    79: "o",
                    80: "p",
                    81: "q",
                    82: "r",
                    83: "s",
                    84: "t",
                    85: "u",
                    86: "v",
                    87: "w",
                    88: "x",
                    89: "y",
                    90: "z",
                    96: "0",
                    97: "1",
                    98: "2",
                    99: "3",
                    100: "4",
                    101: "5",
                    102: "6",
                    103: "7",
                    104: "8",
                    105: "9",
                    190: "."
                }
            };
            i.prototype = function() {
                var o, a, c, d, f, p, h, m, g, v, y, b, x, C, w, k, T = 0, E = 1e3, N = "", S = !!Object.prototype.hasOwnProperty.call(t, "ontouchstart"), L = t.matchMedia("(max-width: 48em)"), $ = function(e) {
                    return e.originalEvent.targetTouches ? e.originalEvent.targetTouches[0] : e
                };
                return g = function(e, t) {
                    t.attr({
                        tabindex: 0,
                        "aria-haspopup": !0,
                        "aria-owns": e.attr("id"),
                        "aria-controls": e.attr("id"),
                        "aria-expanded": !1
                    }),
                        e.attr({
                            role: "group",
                            "aria-expanded": !1,
                            "aria-hidden": !0
                        }).not("[aria-labelledby]").attr("aria-labelledby", t.attr("id"))
                }
                    ,
                    v = function(e, t) {
                        t.removeAttr("tabindex aria-haspopup aria-owns aria-controls aria-expanded"),
                            e.removeAttr("role aria-expanded aria-hidden aria-labelledby")
                    }
                    ,
                    m = function(t) {
                        var n = (this.settings,
                            this.nav)
                            , i = this.menu
                            , o = n.find("#toggle-mobile-mainmenu")
                            , a = n.find("#sitesearch")
                            , r = n.find("#toggle-mobile-search")
                            , s = n.find("#toggle-varsler-mobile")
                            , l = e("#varsler-display");
                        L.addListener(function() {
                            L.matches ? (e(n).find("button.mobile-toggler").attr({
                                "aria-hidden": !1
                            }),
                                g.call(this, i, o),
                                g.call(this, a, r),
                                g.call(this, l, s),
                                t.each(function(t, n) {
                                    n = e(n);
                                    var i = n.prevAll(".mobile-submenu-expander").eq(0);
                                    i.attr("tabindex") || g.call(this, n, i)
                                })) : (e(n).find(".mobile-toggler").attr({
                                "aria-hidden": !0
                            }),
                                v.call(this, i, o),
                                v.call(this, a, r),
                                v.call(this, l, s),
                                t.each(function(t, n) {
                                    n = e(n);
                                    var i = n.prevAll(".mobile-submenu-expander").eq(0);
                                    i.attr("tabindex") && v.call(this, n, i)
                                }))
                        })
                    }
                    ,
                    y = function(t, n) {
                        var i = e(t.target)
                            , o = this
                            , a = o.settings
                            , r = o.menu
                            , s = r.find(".mobile-submenu-expander." + a.openClass).not(i);
                        n ? i.attr("aria-expanded", "false").removeClass(a.openClass).siblings("ul").attr("aria-expanded", "false").attr("aria-hidden", "true").removeClass(a.openClass) : (s.attr("aria-expanded", "false").removeClass(a.openClass).siblings("ul").attr("aria-expanded", "false").attr("aria-hidden", "true").removeClass(a.openClass),
                            i.attr("aria-expanded", "true").addClass(a.openClass).siblings("ul").attr("aria-expanded", "true").attr("aria-hidden", "false").addClass(a.openClass))
                    }
                    ,
                    C = function(t, n) {
                        for (var i = 40, o = 0, a = 0, r = 0, s = n.find("li"), l = Math.ceil(s.length / 10), c = 0; l > c; c++)
                            t.append('<div class="footer-col"><ul></ul></div>');
                        var u = t.find("ul");
                        e(s).each(function() {
                            i >= o && (10 > a && 4 > r ? (u[r].appendChild(e(this)[0]),
                                o++,
                                a++) : a > 9 && (r++,
                                u[r].appendChild(e(this)[0]),
                                a = 1,
                                o++))
                        })
                    }
                    ,
                    w = function(e) {
                        "function" == typeof jQuery && e instanceof jQuery && (e = e[0]);
                        var i = e.getBoundingClientRect();
                        return i.top >= 0 && i.left >= 0 && i.bottom <= (t.innerHeight || n.documentElement.clientHeight) && i.right <= (t.innerWidth || n.documentElement.clientWidth)
                    }
                    ,
                    k = function(t) {
                        setTimeout(function() {
                            w(t) || e("html, body").animate({
                                scrollTop: t.offset().top
                            }, 300)
                        }, 300)
                    }
                    ,
                    x = function(n) {
                        var i, o = n, a = o.find("a:first"), r = a.attr("href"), s = o.find(".accessible-megafooter-panel"), l = o.find(".panel-wrapper"), c = function() {
                            var e = l.height()
                                , t = s.height() + 50;
                            t > e && l.height(t)
                        };
                        !s.find("ul").length > 0 && (a.attr("aria-busy", "true"),
                            s.append('<div class="spinner"></div>'),
                            l.height(2 * s.find(".spinner").height()),
                            e.ajax({
                                type: "GET",
                                url: r
                            }).always(function() {
                                a.attr("aria-busy", "false"),
                                    s.find(".spinner").remove(),
                                    s.find("p").remove()
                            }).fail(function() {
                                t.location = r
                            }).done(function(n) {
                                var o = e.parseHTML(n)
                                    , a = e("#content-a-z", o).find("ul");
                                a.length > 0 ? (e("html").hasClass("no-csscolumns") ? C(s, a) : a.removeClass().addClass("footer-columns").appendTo(s),
                                    c(),
                                    e(t).resize(function() {
                                        clearTimeout(i),
                                            i = setTimeout(c, 300)
                                    }),
                                    k(l)) : (l.height(150),
                                    k(l),
                                    s.append("<p>Fant ikke innhold</p>"))
                            }))
                    }
                    ,
                    o = function(t) {
                        return e(t).closest(":data(plugin_" + l + ")").data("plugin_" + l)
                    }
                    ,
                    a = function(t) {
                        t = e(t);
                        var n = this.settings;
                        t.attr("id") || t.attr("id", n.uuidPrefix + "-" + (new Date).getTime() + "-" + ++T)
                    }
                    ,
                    c = function(t, n) {
                        var i = e(t.target)
                            , o = this
                            , a = this.settings
                            , r = this.menu
                            , s = i.closest("." + a.topNavItemClass);
                        if (i.hasClass(a.panelClass) ? i : i.closest("." + a.panelClass),
                                h.call(this, n),
                            r.hasClass("m-open") || e("html").off("mouseup.outside-accessible-megamenu, touchend.outside-accessible-megamenu, mspointerup.outside-accessible-megamenu, pointerup.outside-accessible-megamenu", f),
                                n)
                            s = r.find("." + a.topNavItemClass + " ." + a.openClass + ":first").closest("." + a.topNavItemClass),
                                s.find("[aria-expanded]").attr("aria-expanded", "false").removeClass(a.openClass).filter(".mobile-submenu, ." + a.panelClass).attr("aria-hidden", "true"),
                                o.animTimeoutID = setTimeout(function() {
                                    s.find("." + a.jsAnimatedClass).removeClass(a.jsAnimatedClass)
                                }, 300),
                                r.removeClass(a.jsMenuExpandedClass);
                        else {
                            clearTimeout(o.focusTimeoutID),
                                clearTimeout(o.animTimeoutID);
                            var l = s.find(".accessible-megafooter-panel");
                            l.length > 0 && (l.hasClass("content-loaded") || x(s)),
                                s.siblings().removeClass(a.selectedTopNavItem).find("[aria-expanded]").attr("aria-expanded", "false").removeClass(a.openClass).removeClass(a.jsAnimatedClass).filter(".mobile-submenu, ." + a.panelClass).attr("aria-hidden", "true"),
                                s.addClass(a.selectedTopNavItem).find("[aria-expanded]").not(".mobile-submenu-expander, .mobile-submenu, .logginninfo").attr("aria-expanded", "true").addClass(a.openClass).addClass(a.jsAnimatedClass).filter("." + a.panelClass).attr("aria-hidden", "false"),
                            l.length > 0 && k(l),
                                r.addClass(a.jsMenuExpandedClass),
                                h.call(o)
                        }
                    }
                    ,
                    b = function(t, n) {
                        var i = e(t.target)
                            , o = this
                            , a = (this.settings,
                            this.nav)
                            , r = this.menu
                            , s = a.find("button.mobile-toggler");
                        h.call(this, n),
                            e("html").off("mouseup.outside-accessible-megamenu, touchend.outside-accessible-megamenu, mspointerup.outside-accessible-megamenu, pointerup.outside-accessible-megamenu", f),
                            n ? (s.removeClass("m-open").attr("aria-expanded", !1),
                                r.add("#sitesearch").removeClass("m-open").attr({
                                    "aria-expanded": !1,
                                    "aria-hidden": !0
                                }),
                                r.add("#varsler-display").removeClass("m-open").attr({
                                    "aria-expanded": !1,
                                    "aria-hidden": !0
                                })) : (i.addClass("m-open").attr("aria-expanded", !0).siblings("button.mobile-toggler").removeClass("m-open").attr("aria-expanded", !1),
                                e("#" + i.attr("aria-controls")).addClass("m-open").attr({
                                    "aria-expanded": !0,
                                    "aria-hidden": !1
                                }),
                                i.siblings("button.mobile-toggler").each(function() {
                                    e("#" + e(this).attr("aria-controls")).removeClass("m-open").attr({
                                        "aria-expanded": !1,
                                        "aria-hidden": !0
                                    })
                                }),
                                h.call(o))
                    }
                    ,
                    d = function(t) {
                        var n = e(t.target)
                            , i = n.closest("." + this.settings.topNavItemClass)
                            , o = i.find("a:first")
                            , a = n.closest("." + this.settings.panelClass);
                        if (n.is("a > span") && (n = n.parent("a")),
                            1 === i.length && 0 === a.length && 1 === i.find("." + this.settings.panelClass).length && n[0] === o[0]) {
                            t.preventDefault(),
                                t.stopPropagation();
                            var s = e("#varsler-display");
                            s.hasClass("open") && s.removeClass("open"),
                                n.hasClass(this.settings.openClass) ? c.call(this, t, n.hasClass(this.settings.openClass)) : c.call(this, t),
                                r()
                        } else
                            n.is("[tabindex].mobile-submenu-expander") ? (t.preventDefault(),
                                t.stopPropagation(),
                                n.hasClass(this.settings.openClass) ? y.call(this, t, !0) : y.call(this, t)) : n.is("button.mobile-toggler") && (n.is(".m-open") ? b.call(this, t, !0) : b.call(this, t))
                    }
                    ,
                    f = function(n) {
                        var i = e(n.target);
                        return (t.navigator.msPointerEnabled || t.navigator.pointerEnabled) && "html" === i.context.localName ? !1 : s(i) ? !1 : (0 === this.interactiveArea.has(i).length && 0 === this.mobileMenuTogglers.filter(i).length && (n.preventDefault(),
                            n.stopPropagation(),
                            c.call(this, n, !0),
                        this.settings.enableMobileMenu && this.nav.has(".m-open").length && b.call(this, n, !0),
                            r()),
                            void 0)
                    }
                    ,
                    p = function(n) {
                        var i, a, r, s, l, f, p = e(e(this).is(".hover:tabbable") ? this : n.target), h = p.is(n.target) ? this : o(p), m = h.settings, g = h.menu, v = h.topnavitems, y = p.closest("." + m.topNavItemClass), b = g.find(":tabbable"), x = p.hasClass(m.panelClass) ? p : p.closest("." + m.panelClass), C = x.find("." + m.panelGroupClass), w = p.closest("." + m.panelGroupClass), k = n.keyCode || n.which, T = !1, S = u.keyMap[n.keyCode] || "", L = 1 === y.length && 0 === x.length, $ = p.is(".mobile-submenu-expander");
                        if (e(n.target).is("input"))
                            return !0;
                        switch (p.is(".hover:tabbable") && e("html").off("keydown.accessible-megamenu"),
                            k) {
                            case u.ESCAPE:
                                c.call(h, n, !0);
                                break;
                            case u.DOWN:
                                n.preventDefault(),
                                    L ? (c.call(h, n),
                                        setTimeout(function() {
                                            T = 1 === y.find("." + m.panelClass + " :tabbable:first").focus().length
                                        }, 100)) : T = 1 === b.filter(":gt(" + b.index(p) + "):first").focus().length,
                                !T && t.opera && "[object Opera]" === opera.toString() && (n.ctrlKey || n.metaKey) && (b = e(":tabbable"),
                                    r = b.index(p),
                                    T = 1 === e(":tabbable:gt(" + e(":tabbable").index(p) + "):first").focus().length);
                                break;
                            case u.UP:
                                n.preventDefault(),
                                    L && p.hasClass(m.openClass) ? (c.call(h, n, !0),
                                        i = v.filter(":lt(" + v.index(y) + "):last"),
                                    i.children("." + m.panelClass).length && (T = 1 === i.children().attr("aria-expanded", "true").addClass(m.openClass).filter("." + m.panelClass).attr("aria-hidden", "false").find(":tabbable:last").focus())) : L || (T = 1 === b.filter(":lt(" + b.index(p) + "):last").focus().length),
                                !T && t.opera && "[object Opera]" === opera.toString() && (n.ctrlKey || n.metaKey) && (b = e(":tabbable"),
                                    r = b.index(p),
                                    T = 1 === e(":tabbable:lt(" + e(":tabbable").index(p) + "):first").focus().length);
                                break;
                            case u.RIGHT:
                                n.preventDefault(),
                                    L ? T = 1 === v.filter(":gt(" + v.index(y) + "):first").find(":tabbable:first").focus().length : (C.length && w.length && (T = 1 === C.filter(":gt(" + C.index(w) + "):first").find(":tabbable:first").focus().length),
                                    T || (T = 1 === y.find(":tabbable:first").focus().length));
                                break;
                            case u.LEFT:
                                n.preventDefault(),
                                    L ? T = 1 === v.filter(":lt(" + v.index(y) + "):last").find(":tabbable:first").focus().length : (C.length && w.length && (T = 1 === C.filter(":lt(" + C.index(w) + "):last").find(":tabbable:first").focus().length),
                                    T || (T = 1 === y.find(":tabbable:first").focus().length));
                                break;
                            case u.TAB:
                                r = b.index(p),
                                n.shiftKey && L && p.hasClass(m.openClass) || (n.shiftKey && r > 0 ? T = 1 === b.filter(":lt(" + r + "):last").focus().length : !n.shiftKey && r < b.length - 1 ? T = 1 === b.filter(":gt(" + r + "):first").focus().length : t.opera && "[object Opera]" === opera.toString() && (b = e(":tabbable"),
                                    r = b.index(p),
                                    T = n.shiftKey ? 1 === e(":tabbable:lt(" + e(":tabbable").index(p) + "):last").focus().length : 1 === e(":tabbable:gt(" + e(":tabbable").index(p) + "):first").focus().length)),
                                T && n.preventDefault();
                                break;
                            case u.SPACE:
                                (L || $) && (n.preventDefault(),
                                    d.call(h, n));
                                break;
                            default:
                                if ($ && u.ENTER && (n.preventDefault(),
                                        d.call(h, n)),
                                        clearTimeout(this.keydownTimeoutID),
                                        N += S !== N ? S : "",
                                    0 === N.length)
                                    return;
                                for (this.keydownTimeoutID = setTimeout(function() {
                                    N = ""
                                }, E),
                                         b = L && !p.hasClass(m.openClass) ? b.filter("." + m.topNavItemClass + " > :tabbable") : y.find(":tabbable"),
                                     n.shiftKey && (b = e(b.get().reverse())),
                                         r = 0; r < b.length; r++)
                                    if (s = b.eq(r),
                                            s.is(p)) {
                                        a = 1 === N.length ? r + 1 : r;
                                        break
                                    }
                                for (f = new RegExp("^" + N.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g, "\\$&"),"i"),
                                         r = a; r < b.length; r++)
                                    if (s = b.eq(r),
                                            l = e.trim(s.text()),
                                            f.test(l)) {
                                        T = !0,
                                            s.focus();
                                        break
                                    }
                                if (!T)
                                    for (r = 0; a > r; r++)
                                        if (s = b.eq(r),
                                                l = e.trim(s.text()),
                                                f.test(l)) {
                                            s.focus();
                                            break
                                        }
                        }
                        h.justFocused = !1
                    }
                    ,
                    h = function(t) {
                        var n = this.menu;
                        t && !n.hasClass("m-open") ? e("html").off("mouseup.outside-accessible-megamenu, touchend.outside-accessible-megamenu, mspointerup.outside-accessible-megamenu,  pointerup.outside-accessible-megamenu", f) : e("html").on("mouseup.outside-accessible-megamenu, touchend.outside-accessible-megamenu, mspointerup.outside-accessible-megamenu,  pointerup.outside-accessible-megamenu", e.proxy(f, this))
                    }
                    ,
                    {
                        constructor: i,
                        init: function() {
                            var t = this
                                , n = this.settings
                                , i = (this.justFocused = !1,
                                this.nav = e(this.element))
                                , o = this.menu = i.find("ul").first()
                                , r = this.mobileMenuTogglers = i.find("button.mobile-toggler")
                                , s = this.interactiveArea = n.enableMobileMenu ? o.add(r).add(e("#sitesearch")).add(e("#varsler-display")) : o
                                , l = this.topnavitems = o.children()
                                , c = !1
                                , u = !1
                                , f = 0
                                , h = 0;
                            if (l.each(function(i, o) {
                                    var r, s;
                                    o = e(o),
                                        o.addClass(n.topNavItemClass),
                                        r = o.find("a:first"),
                                        s = o.find(".panel-wrapper").children(":not(:tabbable):last"),
                                        a.call(t, r),
                                    s.length && (a.call(t, s),
                                        r.attr({
                                            "aria-haspopup": !0,
                                            "aria-owns": s.attr("id"),
                                            "aria-controls": s.attr("id"),
                                            "aria-expanded": !1
                                        }),
                                        s.attr({
                                            role: "group",
                                            "aria-expanded": !1,
                                            "aria-hidden": !0
                                        }).addClass(n.panelClass).not("[aria-labelledby]").attr("aria-labelledby", r.attr("id")))
                                }),
                                    n.enableMobileMenu) {
                                var v = l.find(".mobile-submenu:not(.languages)");
                                L.matches ? (e(i).find("button.mobile-toggler").attr({
                                    "aria-hidden": !1
                                }),
                                    e(i).find("label.mobile-toggler, input.mobile-toggler").attr({
                                        "aria-hidden": !0
                                    }),
                                    g.call(t, o, e("#toggle-mobile-mainmenu")),
                                    g.call(t, e("#sitesearch"), e("#toggle-mobile-search")),
                                    g.call(t, e("#varsler-display"), e("#toggle-varsler-mobile"))) : e(i).find(".mobile-toggler").attr({
                                    "aria-hidden": !0
                                }),
                                    v.each(function(n, i) {
                                        i = e(i);
                                        var o = i.prevAll(".mobile-submenu-expander").eq(0);
                                        a.call(t, i),
                                            a.call(t, o),
                                        L.matches && g.call(t, i, o)
                                    }),
                                    m.call(t, v)
                            }
                            S ? s.on("touchstart.accessible-megamenu", function(e) {
                                var t = $(e);
                                c = !1,
                                    f = t.clientX,
                                    h = t.clientY
                            }).on("touchmove.accessible-megamenu", function(e) {
                                var t = $(e);
                                (Math.abs(t.clientX - f) > 10 || Math.abs(t.clientY - h) > 10) && (c = !0)
                            }).on("touchend.accessible-megamenu", function(e) {
                                c ? e.stopImmediatePropagation() : u = !0
                            }).on("touchend.accessible-megamenu", e.proxy(d, this)).on("click.accessible-megamenu", function(t) {
                                var n = e(t.target);
                                !u || n.is("a:not([aria-expanded])") || n.is("input") || (t.preventDefault(),
                                    t.stopImmediatePropagation())
                            }).on("click.accessible-megamenu", e.proxy(d, this)) : s.on("click.accessible-megamenu", e.proxy(d, this)),
                                s.on("keydown.accessible-megamenu", e.proxy(p, this))
                        },
                        getDefaults: function() {
                            return this._defaults
                        },
                        getOption: function(e) {
                            return this.settings[e]
                        },
                        getAllOptions: function() {
                            return this.settings
                        },
                        setOption: function(e, t, n) {
                            this.settings[e] = t,
                            n && this.init()
                        }
                    }
            }(),
                e.fn[l] = function(t) {
                    return this.each(function() {
                        e.data(this, "plugin_" + l) || e.data(this, "plugin_" + l, new i(this,t))
                    })
                }
                ,
                e.extend(e.expr[":"], {
                    data: e.expr.createPseudo ? e.expr.createPseudo(function(t) {
                        return function(n) {
                            return !!e.data(n, t)
                        }
                    }) : function(t, n, i) {
                        return !!e.data(t, i[3])
                    }
                    ,
                    focusable: function(t) {
                        return a(t, !isNaN(e.attr(t, "tabindex")))
                    },
                    tabbable: function(t) {
                        var n = e.attr(t, "tabindex")
                            , i = isNaN(n);
                        return (i || n >= 0) && a(t, !i)
                    }
                })
        }(jQuery, window, document)
    }),
    $(document).ready(function() {
        $("#mainmenu").accessibleMegaMenu({
            enableMobileMenu: !0
        }),
            $("#footer-content-menu").accessibleMegaMenu({
                uuidPrefix: "accessible-megafooter",
                menuClass: "accessible-megafooter",
                topNavItemClass: "letter",
                panelClass: "accessible-megafooter-panel",
                selectedTopNavItem: "selected-letter"
            })
    });
