// ===================================================
 // bootstrap-transition.js v2.3.2
 // http://twitter.github.com/bootstrap/javascript.html#transitions
 // ===================================================
 // Copyright 2012 Twitter, Inc.
 //
 // Licensed under the Apache License, Version 2.0 (the "License");
 // you may not use this file except in compliance with the License.
 // You may obtain a copy of the License at
 //
 // http://www.apache.org/licenses/LICENSE-2.0
 //
 // Unless required by applicable law or agreed to in writing, software
 // distributed under the License is distributed on an "AS IS" BASIS,
 // WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 // See the License for the specific language governing permissions and
 // limitations under the License.
 // ==========================================================


!function ($) {
  "use strict"; // jshint ;_;
  /* CSS TRANSITION SUPPORT (http://www.modernizr.com/)
   * ======================================================= */
  $(function () {
    $.support.transition = (function () {
    
      var transitionEnd = (function () {
        var el = document.createElement('bootstrap')
          , transEndEventNames = {
               'WebkitTransition' : 'webkitTransitionEnd'
            ,  'MozTransition'    : 'transitionend'
            ,  'OTransition'      : 'oTransitionEnd otransitionend'
            ,  'transition'       : 'transitionend'
            }
          , name

        for (name in transEndEventNames){
          if (el.style[name] !== undefined) {
            return transEndEventNames[name]
          }
        }
      }())
      return transitionEnd && {
        end: transitionEnd
      }
    })()
  })
}(window.jQuery);

function transitionAnim() {
  alert("Animt");
}

/**
* Bootstrap.js by @fat & @mdo
* plugins: bootstrap-carousel.js
* Copyright 2012 Twitter, Inc.
* http://www.apache.org/licenses/LICENSE-2.0.txt

!function(a){var b=function(b,c){this.$element=a(b),this.$indicators=this.$element.find(".carousel-indicators"),this.options=c,this.options.pause=="hover"&&this.$element.on("mouseenter",a.proxy(this.pause,this)).on("mouseleave",a.proxy(this.cycle,this))};b.prototype={cycle:function(b){return b||(this.paused=!1),this.interval&&clearInterval(this.interval),this.options.interval&&!this.paused&&(this.interval=setInterval(a.proxy(this.next,this),this.options.interval)),this},getActiveIndex:function(){return this.$active=this.$element.find(".item.active"),this.$items=this.$active.parent().children(),this.$items.index(this.$active)},to:function(b){var c=this.getActiveIndex(),d=this;if(b>this.$items.length-1||b<0)return;return this.sliding?this.$element.one("slid",function(){d.to(b)}):c==b?this.pause().cycle():this.slide(b>c?"next":"prev",a(this.$items[b]))},pause:function(b){return b||(this.paused=!0),this.$element.find(".next, .prev").length&&a.support.transition.end&&(this.$element.trigger(a.support.transition.end),this.cycle(!0)),clearInterval(this.interval),this.interval=null,this},next:function(){if(this.sliding)return;return this.slide("next")},prev:function(){if(this.sliding)return;return this.slide("prev")},slide:function(b,c){var d=this.$element.find(".item.active"),e=c||d[b](),f=this.interval,g=b=="next"?"left":"right",h=b=="next"?"first":"last",i=this,j;this.sliding=!0,f&&this.pause(),e=e.length?e:this.$element.find(".item")[h](),j=a.Event("slide",{relatedTarget:e[0],direction:g});if(e.hasClass("active"))return;this.$indicators.length&&(this.$indicators.find(".active").removeClass("active"),this.$element.one("slid",function(){var b=a(i.$indicators.children()[i.getActiveIndex()]);b&&b.addClass("active")}));if(a.support.transition&&this.$element.hasClass("slide")){this.$element.trigger(j);if(j.isDefaultPrevented())return;e.addClass(b),e[0].offsetWidth,d.addClass(g),e.addClass(g),this.$element.one(a.support.transition.end,function(){e.removeClass([b,g].join(" ")).addClass("active"),d.removeClass(["active",g].join(" ")),i.sliding=!1,setTimeout(function(){i.$element.trigger("slid")},0)})}else{this.$element.trigger(j);if(j.isDefaultPrevented())return;d.removeClass("active"),e.addClass("active"),this.sliding=!1,this.$element.trigger("slid")}return f&&this.cycle(),this}};var c=a.fn.carousel;a.fn.carousel=function(c){return this.each(function(){var d=a(this),e=d.data("carousel"),f=a.extend({},a.fn.carousel.defaults,typeof c=="object"&&c),g=typeof c=="string"?c:f.slide;e||d.data("carousel",e=new b(this,f)),typeof c=="number"?e.to(c):g?e[g]():f.interval&&e.pause().cycle()})},a.fn.carousel.defaults={interval:5e3,pause:"hover"},a.fn.carousel.Constructor=b,a.fn.carousel.noConflict=function(){return a.fn.carousel=c,this},a(document).on("click.carousel.data-api","[data-slide], [data-slide-to]",function(b){var c=a(this),d,e=a(c.attr("data-target")||(d=c.attr("href"))&&d.replace(/.*(?=#[^\s]+$)/,"")),f=a.extend({},e.data(),c.data()),g;e.carousel(f),(g=c.attr("data-slide-to"))&&e.data("carousel").pause().to(g).cycle(),b.preventDefault()})}(window.jQuery)
*/


/* ==========================================================
 * bootstrap-carousel.js v2.3.2
 * http://twitter.github.com/bootstrap/javascript.html#carousel
 * ==========================================================
 * Copyright 2012 Twitter, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ========================================================== */


!function ($) {

  "use strict"; // jshint ;_;


 /* CAROUSEL CLASS DEFINITION
  * ========================= */

  var Carousel = function (element, options) {
    this.$element = $(element)
    this.$indicators = this.$element.find('.carousel-indicators')
    this.options = options
    
    this.options.pause == 'hover' && this.$element
      .on('mouseenter', $.proxy(this.pause, this))
      .on('mouseleave', $.proxy(this.cycle, this))
  }

  Carousel.prototype = {

    cycle: function (e) {
      if (!e) this.paused = false
      if (this.interval) clearInterval(this.interval);
      this.options.interval
        && !this.paused
        && (this.interval = setInterval($.proxy(this.next, this), this.options.interval))
      return this
    }

  , getActiveIndex: function () {
      this.$active = this.$element.find('.item.active')
      this.$items = this.$active.parent().children()
      return this.$items.index(this.$active)
    }

  , to: function (pos) {
      var activeIndex = this.getActiveIndex()
        , that = this
      
      if (pos > (this.$items.length - 1) || pos < 0) return
      
      if (activeIndex == pos) {
        return this.pause().cycle()
      }

      return this.slide(pos > activeIndex ? 'next' : 'prev', $(this.$items[pos]))
    }

  , pause: function (e) {
      if (!e) this.paused = true
      if (this.$element.find('.next, .prev').length && $.support.transition.end) {
        this.$element.trigger($.support.transition.end)
        this.cycle(true)
      }
      clearInterval(this.interval)
      this.interval = null
      return this
    }

  , next: function () {
      if (this.sliding) return
      return this.slide('next')
    }

  , prev: function () {
      if (this.sliding) return
      return this.slide('prev')
    }

  , slide: function (type, next) {
      var $active = this.$element.find('.item.active')
        , $next = next || $active[type]()
        , isCycling = this.interval
        , direction = type == 'next' ? 'left' : 'right'
        , fallback  = type == 'next' ? 'first' : 'last'
        , that = this
        , e

      this.sliding = true
      
      
      
      isCycling && this.pause()

      $next = $next.length ? $next : this.$element.find('.item')[fallback]()

      e = $.Event('slide', {
        relatedTarget: $next[0]
      , direction: direction
      })

      if ($next.hasClass('active')) return

      if (this.$indicators.length) {
        this.$indicators.find('.active').removeClass('active')
        this.$element.one('slid', function () {
          
          var $nextIndicator = $(that.$indicators.children()[that.getActiveIndex()])
          $nextIndicator && $nextIndicator.addClass('active')
          
          var nextSlide = $nextIndicator.attr('data-slide-to');
          
          var indicators = $('.carousel-indicators');
          indicators.attr('data-active-slide', (nextSlide));
          
          // Accessibility part
          //indicators.attr('aria-valuenow', (parseInt(nextSlide)+1));
          indicators.find('li').attr('aria-selected', 'false');
          indicators.find('li.active').attr('aria-selected', 'true');
          
          var itemsContainer = $('#carousel-items');
          
          //itemsContainer.find('.item.active').attr('id', 'slide-item-'+nextSlide);
          
          itemsContainer.attr('aria-owns', 'slide-item-'+nextSlide);
          //itemsContainer.attr('aria-valuenow', (parseInt(nextSlide)+1));
          itemsContainer.find('div.item').each(function() {
          
            if ($(this).hasClass('active')) {
              $(this).attr('aria-hidden', 'false');
            }
            else {
              $(this).attr('aria-hidden', 'true');
            }
          });
          ////////////
          
          //$('.carousel-label span').html("Side "+slideIndex+" av "+$('.carousel').attr('data-size'));
        })
      }

      if ($.support.transition && this.$element.hasClass('slide')) {
        this.$element.trigger(e)
        if (e.isDefaultPrevented()) return
        $next.addClass(type)
        $next[0].offsetWidth // force reflow
        $active.addClass(direction)
        $next.addClass(direction)
        this.$element.one($.support.transition.end, function () {
          $next.removeClass([type, direction].join(' ')).addClass('active')
          $active.removeClass(['active', direction].join(' '))
          that.sliding = false
          setTimeout(function () { that.$element.trigger('slid') }, 0)
        })
      } else {
        this.$element.trigger(e)
        if (e.isDefaultPrevented()) return
        $active.removeClass('active')
        $next.addClass('active')
        this.sliding = false
        this.$element.trigger('slid')
      }
      //var activeSlide = $('.carousel-indicators li').find('.active');
      //var slideNumber = activeSlide.attr('data-slide-to');
      
      isCycling && this.cycle()

      return this
    }

  }


 /* CAROUSEL PLUGIN DEFINITION
  * ========================== */

  var old = $.fn.carousel

  $.fn.carousel = function (option) {
    return this.each(function () {
      var $this = $(this)
        , data = $this.data('carousel')
        , options = $.extend({}, $.fn.carousel.defaults, typeof option == 'object' && option)
        , action = typeof option == 'string' ? option : options.slide
      if (!data) $this.data('carousel', (data = new Carousel(this, options)))
      if (typeof option == 'number') data.to(option)
      else if (action) data[action]()
      else if (options.interval) data.pause().cycle()
    })
  }

  $.fn.carousel.defaults = {
    interval: 5000
  , pause: 'hover'
  }

  $.fn.carousel.Constructor = Carousel


 /* CAROUSEL NO CONFLICT
  * ==================== */

  $.fn.carousel.noConflict = function () {
    $.fn.carousel = old
    return this
  }

 /* CAROUSEL DATA-API
  * ================= */

  $(document).on('click.carousel.data-api', '[data-slide], [data-slide-to]', function (e) {
  
    var $this = $(this), href
      , $target = $($this.attr('data-target') || (href = $this.attr('href')) && href.replace(/.*(?=#[^\s]+$)/, '')) //strip for ie7
      , options = $.extend({}, $target.data(), $this.data())
      , slideIndex

    $target.carousel(options)
     
      
      if (this.sliding) {
        return this.$element.one('slid', function () {
          that.to(pos)
        })
      }
    
    if (slideIndex = $this.attr('data-slide-to')) {
      
      $target.data('carousel').pause().to(slideIndex).cycle()
    }

    e.preventDefault()
  })

}(window.jQuery);



// ------------------ \\
//   Carousel stuff   \\
// ------------------ \\

navno.displayCarousel = function (numArticles) {

  var viewPreferenceKey = "showCarouselView";
  
  var indicators = $('.carousel-indicators');
  
  var slidesSize = indicators.find('li').length;
  indicators.attr('data-active-slide', 0);
  
  $('#navCarousel').attr("data-size", slidesSize);
  
  var ieControl = $('.col-lg-12 > a.carousel-control');
  if (ieControl.length > 0) {
    ieControl.remove();
    // TODO in bootstrap: IE bug workaround
  } else if ($('.col-lg-12 > div[id^="marker"] > a.carousel-control').length > 0) {
    $('.col-lg-12 > div[id^="marker"] > a.carousel-control').remove();
  }
  
  // Logikk under for vise karusellen
  if (numArticles > 3) {
    
    var inner = $(".carousel-inner");
    
    indicators.removeClass('hide');
    $('.carousel-control').removeClass('hide');
    //$('.carousel-dropdown').removeClass('hide');
    
    // Indicate first slide page
    var items = inner.find('.item')
    items.removeClass('active').removeClass('carousel-onload').first().addClass('active');
    
    var firstSlide = $(".carousel-inner .hero-link-wrapper").first();
    
    var rowMargin = (inner.width() - (firstSlide.width() * 3)) / 2;
    
    var collapseHeightAfter = firstSlide.height();
    var collapseHeightBefore = $('.carousel-outer').height();
    var slideHeighExpanded = Math.ceil((collapseHeightAfter * slidesSize) + ((slidesSize -1) * rowMargin) + 15);
    var fadeSpeed = 400;
    
    var hiddenElements = $("#navCarousel .item[aria-hidden='true']");
    
    var carouselView = $('.carousel-view');
    var listView = $('.carousel-view');
    
    var carouselViewPref = localStorage.getItem(viewPreferenceKey); // View preference
    
    if (carouselViewPref === 'false') {
        
        hiddenElements.removeAttr("style");
        inner.addClass("list");
        hiddenElements.attr("aria-hidden", false);
        //inner.css("height", slideHeighExpanded);
        
        $(".carousel-control").css("display", "none");
        $(".carousel-indicators").css("display", "none");
        
        $(".list-view").attr('data-selected', true);
        $(".carousel-view").attr('data-selected', false);
        
    }
    else if (carouselViewPref === 'true') {
        
        inner.removeClass("list").find(".item").removeAttr("style");
        
        $(".carousel-control").css("display", "");
        $(".carousel-indicators").css("display", "");
        
        $(".list-view").attr('data-selected', false);
        $(".carousel-view").attr('data-selected', true);
        
    }
    else if (carouselViewPref === null) {
        localStorage.setItem(viewPreferenceKey, 'false');
        carouselViewPref = 'false';
        
        hiddenElements.removeAttr("style");
        inner.addClass("list");
        hiddenElements.attr("aria-hidden", false);
        //inner.css("height", slideHeighExpanded);
        
        $(".carousel-control").css("display", "none");
        $(".carousel-indicators").css("display", "none");
        
        $(".list-view").attr('data-selected', true);
        $(".carousel-view").attr('data-selected', false);
        
    }
    
    $(".list-view").on("click", function (e) {
      e.preventDefault();
      
      carouselViewPref = localStorage.getItem(viewPreferenceKey);
      
      if (carouselViewPref !== null && carouselViewPref === 'true') {
        localStorage.setItem(viewPreferenceKey, 'false');
      }
      
      var thisListView = $(this);
      
      if (thisListView.attr('data-selected') === 'true' || carouselView.attr('data-is-sliding') === 'true') {
        return false;
      }
      else {
        thisListView.attr('data-selected', true).removeAttr('style');
        $('.carousel-view').attr('data-selected', false);
      } 
      
      thisListView.attr('data-is-sliding', true);
      
      $(".carousel-control").fadeOut(fadeSpeed);
      $(".carousel-indicators").fadeOut(fadeSpeed, function() {
        
        inner.css("height", collapseHeightBefore);
        
        items.css("display", "block");
        inner.addClass("list");
        
        inner.animate({
          height: slideHeighExpanded
        },
        {
          duration: 500
        }).promise().done(function () {
          items.removeAttr("style");
          hiddenElements.attr("aria-hidden", false);
          inner.removeAttr('style');
          thisListView.attr('data-is-sliding', false);
        });
      });
    });
    
    $(".carousel-view").on("click", function (e) {
      e.preventDefault();
      
      carouselViewPref = localStorage.getItem(viewPreferenceKey);
      
      if (carouselViewPref !== null && carouselViewPref === 'false') {
        localStorage.setItem(viewPreferenceKey, 'true');
      }
      
      var thisCarouselView = $(this);
      
      if ($(this).attr('data-selected') === 'true' || listView.attr('data-is-sliding') === 'true') {
        return false;
      }
      else {
        thisCarouselView.attr('data-selected', true).removeAttr('style');
        $('.list-view').attr('data-selected', false);
      }
      
      thisCarouselView.attr('data-is-sliding', true);
      
      inner.animate({
        height: collapseHeightBefore
      },
      {
        duration: 500
      }).promise().done(function () {
        
        hiddenElements.attr("aria-hidden", true);
        //inner.css("height", collapseHeightAfter);
        inner.removeAttr('style');
        
        thisCarouselView.attr('data-is-sliding', false);
        inner.removeClass("list").find(".item").removeAttr("style");
        $(".carousel-indicators").fadeIn(fadeSpeed);
        $(".carousel-control").fadeIn(fadeSpeed);
      });
    });
    
    $(".hide-all").on("click", function (e) {
      e.preventDefault();
    });
  }
};

/*
 * Carousel initialization
 */
 

 
 //////////////////////// END ////////////////////////

/*
 * Carousel initialization
 */

$(function () {
  
  $('.carousel').carousel({
    interval: false
  });
  
  
  var itemsContainer = $('#carousel-items');
  var items = itemsContainer.find('div.item > div').length;
  
  var numSlides = itemsContainer.find('div.item').length;
  
  if (items > 3 && items <= 6) {
    navno[ 'displayCarousel'](items);
    
  } else if (items > 6) {
    var indicators = $('.carousel-indicators');
    
    for (var i = 2; i < numSlides; i++) {
      $('.carousel-indicators').append('<li class="" data-slide-to="' + i + '" data-target="#navCarousel" aria-selected="false" aria-controls="carousel-items" tabindex="0"><span class="visuallyhidden">Indikator som viser posisjonen til de synlige lenkene. Indikatorene er klikkbar for å navigere frem og tilbake i utvalget av lenker.</span></li>');
    }
    navno[ 'displayCarousel'](items);
  }
});


/*
 * Using left and right slide controls with keyboard
 * TODO: make this a callable function. Need to check if buttons are showing first (links <= 3)
 */

$(function () {
  var carousel = $('#navCarousel');
  var slideItems = carousel.find(".item");
  var leftControl = $('.carousel-control.left');
  var rightControl = $('.carousel-control.right');
  
  $(carousel).add(slideItems).add(leftControl).add(rightControl).on("keyup", function (event) {
    
    if (event.keyCode == 37) {
      $(leftControl).click();
    } else if (event.keyCode == 39) {
      $(rightControl).click();
    }
  });
});
