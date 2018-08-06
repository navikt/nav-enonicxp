// ------------------ \\
//  ScrollTop stuff   \\
// ------------------ \\

$(function () {
  $('nav.table-of-contents li a').click(function (e) {
    var fromLink = $(this);
    e.preventDefault();
    
    navno[ 'scrollToId'](fromLink);
  });
});

/*
 * Reusable
 * Param: link from click event with ref to id on page
 */
navno.scrollToId = function (fromLink) {
  
  var url = fromLink.attr('href');
  var currentId = url.substring(url.lastIndexOf('#'));
  
  $('html, body').animate({
    scrollTop: $(currentId).offset().top - 25
  },
  {
    duration: 1000,
    complete: function () {

      var toc = $('nav.table-of-contents');
      
      var previousId = toc.attr('data-selected-id');
      if (previousId !== "") {
        $(previousId).removeClass('selected')
      }
      toc.attr('data-selected-id', currentId);
      
      window.setTimeout(function () {
        $(currentId)[0].focus();
        if(history && history.pushState) {
          history.pushState(null, null, currentId)
        } else {
          window.location.href = currentId; 
        }        
      },
      0);
      
      var timer = setTimeout(function () {
        $(currentId).addClass('selected');
      },
      800);
    }
  });
};

////////////////////////

// ------------------ \\
//    Print stuff     \\
// ------------------ \\

navno.beforeContentPrint = function () {
  
  var bookURL = $('#print-url').text();
  var ajaxSuccess = false;
  
  var jqxhr = $.ajax({
    type: "GET",
    url: bookURL,
    
    success: function (data) {
      
      ajaxSuccess = true;
      
      var html = $.parseHTML(data);
      
      var article = $('#pagecontent');
      var chapters = article.find('section');
      var allChapter = $(html).find('section');
      
      var selectedIndex = navno[ 'getSelectedChapterIndex']();
      
      // Only book article and preface (and possibly first chapter)
      if (selectedIndex === 0) {
        
        chapters.addClass('hide');
        // First chapter
        
        $(allChapter).each(function () {
          article.append(allChapter);
        });
      } else {
        var articleParent = article.parent();
        var article = $(html).find('article');
        // Print whole article (incl. preface), not just chapters
        
        $('#pagecontent').addClass('hide');
        
        articleParent.append(article);
      }
    },
    complete: function () {
      
      if (ajaxSuccess == true) {
        
        var timer = setTimeout(function () {
          
          ajaxSuccess = false; // Reset
          window.print();
        },
        200);
      }
    }
  });
};

navno.afterContentPrint = function () {
  
  if ($('#print-all').hasClass('selected')) {
    
    $('#print-all').removeClass('selected');
    
    var selectedIndex = navno[ 'getSelectedChapterIndex']();
    
    if (selectedIndex === 0) {
      
      var article = $('#pagecontent');
      var chapters = article.find('section');
      
      chapters.each(function (index) {
        
        var chap = $(this);
        if (index > 0) {
          chap.remove();
        } else {
          chap.removeClass('hide');
        }
      });
      
      article.find('header').removeClass('hide');
      article.find('.article-body').removeClass('hide');
    } else {
      
      $('article').last().remove();
      $('article.hide').removeClass('hide');
    }
  } else if ($('#print-page').hasClass('selected')) {
    $('#print-page').removeClass('selected');
  }
};

navno.getSelectedChapterIndex = function () {
  
  var chapterMenu = $('.content-submenu');
  var selectedChapter = chapterMenu.find('a.selected');
  
  var selectedIndex = -1;
  
  if (selectedChapter.length > 0) {
    
    var li = selectedChapter.parent();
    selectedIndex = chapterMenu.find('li').index(li);
  }
  return selectedIndex;
};

navno.initContentPrintHandler = function () {
  
  if ($('.toolbar').length > 0) {
    
    var printPageLink = $('#print-page');
    
    if (printPageLink.length > 0) {
      printPageLink.on("click", function (e) {
        $(this).addClass('selected');
        window.print();
      });
    
      printPageLink[0].addEventListener('keypress', function (e) {
        var key = e.which || e.keyCode;
        if (key === 13) {
          window.print();
        }
      });
    }
    
    if ($('#print-all').length > 0) {
      
      $("#print-all").on("click", function (e) {
        $(this).addClass('selected');
        
        navno[ 'beforeContentPrint']();
        // For handbook
      });
      
      $("#print-all")[0].addEventListener('keypress', function (e) {
        var key = e.which || e.keyCode;
        if (key === 13) {
          
          $(this).addClass('selected');
          navno[ 'beforeContentPrint']();
        }
      });
    }
  }
};


$(function () {
  
  var hasPrintFired = false;
  var afterPrint = function () {
    
    var timer = setTimeout(function () {
      navno[ 'afterContentPrint']();
    },
    400);
  }
  //window.onbeforeprint = beforePrint;
  window.onafterprint = afterPrint;
  
  if (window.matchMedia) {
    
    var mediaQueryList = window.matchMedia('print');
    mediaQueryList.addListener(function (mql) {
      
      if (hasPrintFired == false) {
        
        if (! mql.matches) {
          
          hasPrintFired = true; // To stop double print calls by Chrome
          
          var timer = setTimeout(function () {
            
            hasPrintFired = false; // Reset (Chrome bug)
            
            navno[ 'afterContentPrint']();
          },
          400);
        }
      }
    });
  }
});

$(function () {
  navno[ 'initContentPrintHandler']();
});

/////////////////////////////////////////////////


// --------------------- \\
//     Navigator WiN     \\
// --------------------- \\

$(function () {
  
  if (document.getElementById("nav-nvv") !== null) {
    
    var param = "nav-veiviser";
    var regexS = "[\\?&]" + param + "=([^&#]*)";
    
    var regex = new RegExp(regexS);
    var results = regex.exec(document.URL);
    
    if (results !== null && ! isNaN(results[1]) && results[1].length < 12) {
      setCookie(param, results[1], 1, true);
      navno[ 'setVVLink'](results[1]);
    } else {
      var c_value = navno[ 'getCookie'](param);
      
      if (c_value !== null && ! isNaN(c_value)) {
        navno[ 'setVVLink'](c_value);
      }
    }
  }
});

navno.setVVLink = function (c_value) {
  var link = document.getElementById("nav-nvv");
  link.href = "https://www.nav.no/workinnorway/page?id=" + c_value;
};

// --------------------- \\
//         End           \\
// --------------------- \\

/*
 * Google Maps API (NAV office)
 */

navno.initMap = function () {
  
  var officeMap = document.getElementById("office-map");
  
  var latlngString = officeMap.getAttribute("data-latlng");
  
  var separator = latlngString.indexOf(",");
  var officelatlng = new google.maps.LatLng(latlngString.substr(0, separator).trim(), latlngString.substr(separator + 1, latlngString.length).trim());
  
  var styles =[ {
    stylers:[ {
      hue: "#3E3832"
    }, {
      weight: 1.2
    }, {
      saturation: -90
    }, {
      gamma: 0.7
    }
    ]
    //{ lightness: -10 }]
  }];
  
  var mapOptions = {
    center: officelatlng,
    zoom: 15,
    mapTypeId: google.maps.MapTypeId.ROADMAP,
    clickable: false
  };
  
  var map = new google.maps.Map(officeMap, mapOptions);
  
  var marker = new google.maps.Marker({
    position: officelatlng,
    map: map,
    icon: "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4NCjwhLS0gR2VuZXJhdG9yOiBBZG9iZSBJbGx1c3RyYXRvciAxNy4wLjAsIFNWRyBFeHBvcnQgUGx1Zy1JbiAuIFNWRyBWZXJzaW9uOiA2LjAwIEJ1aWxkIDApICAtLT4NCjwhRE9DVFlQRSBzdmcgUFVCTElDICItLy9XM0MvL0RURCBTVkcgMS4xLy9FTiIgImh0dHA6Ly93d3cudzMub3JnL0dyYXBoaWNzL1NWRy8xLjEvRFREL3N2ZzExLmR0ZCI+DQo8c3ZnIHZlcnNpb249IjEuMSIgaWQ9Imxva2FsdCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgeD0iMHB4IiB5PSIwcHgiDQoJIHdpZHRoPSIyOS4zODRweCIgaGVpZ2h0PSI1MHB4IiB2aWV3Qm94PSIwLjk5OCAtNi4xODkgMjkuMzg0IDUwIiBlbmFibGUtYmFja2dyb3VuZD0ibmV3IDAuOTk4IC02LjE4OSAyOS4zODQgNTAiDQoJIHhtbDpzcGFjZT0icHJlc2VydmUiPg0KPHBhdGggZmlsbD0iI0MzMDAwMCIgZD0iTTMwLjM4Myw4LjUwM2MwLTguMTE1LTYuNTc3LTE0LjY5Mi0xNC42OTItMTQuNjkyQzcuNTc2LTYuMTg5LDAuOTk4LDAuMzksMC45OTgsOC41MDMNCgljMCwyLjExNiwwLjQ4Nyw0LjEwNSwxLjI5Myw1LjkyM0gyLjI0M0wxNS42OSw0My44MTFsMTMuNDQ1LTI5LjM4NWgtMC4wMThDMjkuOTIsMTIuNjEyLDMwLjM4MywxMC42MTUsMzAuMzgzLDguNTAzeiBNMTUuNzMsMTMuMDk5DQoJYy0yLjA3NywwLTMuNzYxLTEuNjg0LTMuNzYxLTMuNzYxczEuNjg0LTMuNzYxLDMuNzYxLTMuNzYxczMuNzYxLDEuNjg0LDMuNzYxLDMuNzYxUzE3LjgwNywxMy4wOTksMTUuNzMsMTMuMDk5eiIvPg0KPC9zdmc+DQo= ", //officeMap.getAttribute("data-marker-url"),
    title: officeMap.getAttribute("data-marker-title")
  });
  
  map.setOptions({
    styles: styles
  });
};

$(function () {
  
  if ($("#office-map").length > 0) {
    
    var script = document.createElement("script");
    script.type = "text/javascript";
    script.src = "https://maps.googleapis.com/maps/api/js?key=AIzaSyDKiZHl59dNmJJwQhfi0YH5AtrrMkzDtqQ&sensor=false&callback=navno.initMap";
    document.body.appendChild(script);
  }
});
//////////////////////// END ////////////////////////



// ------------------------------ \\
// Language shortcuts for content \\
// ------------------------------ \\
navno.onClickEnterContentLanguage = function (langList, langSelector) {
  
  var langClick = function (event) {
    
    var langSelector = $('.content-languages');
    
    if (typeof event !== "undefined") {
      event.stopPropagation();
      
      var globalLang = $("header.siteheader ul.dropdown-menu");
      if (! globalLang.hasClass("hidden")) {
        globalLang.addClass("hidden");
      }
    }
    
    
    if (! langSelector.hasClass('selected')) {
      langSelector.addClass('selected');
      langList.removeClass('hide');
    } else {
      langList.addClass('hide');
      langSelector.removeClass('selected');
    }
  }
  return langClick;
};

navno.contentLanguages = function () {
  
  var langSelector = $('.content-languages');
  
  if (langSelector.length > 0) {
    
    var langList = langSelector.find("ul");
    langSelector.on("click", navno[ 'onClickEnterContentLanguage'](langList, langSelector));
    
    langSelector.on('keyup', function (e) {
      
      var key = e.which || e.keyCode;
      
      if (key === 13) {
        //navno[ 'onClickEnterContentLanguage'](langList, langSelector);
        if (! langSelector.hasClass('selected')) {
          langSelector.addClass('selected');
          langList.removeClass('hide');
        } else {
          langList.addClass('hide');
          langSelector.removeClass('selected');
        }
      }
    });
  }
};

$(function () {
  navno[ 'contentLanguages']();
});

// --------------------- \\
//         End           \\
// --------------------- \\


// --------------------- \\
//     LeseWeb handler   \\
// --------------------- \\

navno.initSpeechSynthesisButtons = function () {
  
  var playBtn = $("#play-btn");
  
  if (playBtn.length > 0) {
    
    playBtn.click(function (e) {
      e.preventDefault();
      
      
      if (! $(this).hasClass('play')) {
        $(this).addClass('play');
      }
      
      var selection = window.getSelection();
      if ((typeof selection !== "undefined" && selection.toString().length > 0) || (typeof document.selection !== "undefined" && document.selection.toString().length > 0)) {
        
        vFact_doplay();
      } else {
        
        var pageContent = $('#pagecontent');
        var toolbar = pageContent.find('.toolbar');
        var timePublished = pageContent.find('time.pubdate');
        
        var langSelector = $('.content-languages');
        
        $('#pagecontent .toolbar').remove();
        $('#pagecontent time.pubdate').remove();
        
        vFact_playsection("pagecontent");
        
        toolbar.insertAfter('#pagecontent > header > h1');
        timePublished.insertBefore('#pagecontent > header > h1');
        
        if ($(".content-languages").length > 0) {
          navno[ 'contentLanguages']();
        }
        navno[ 'initTextToSpeechPanel']();
        navno[ 'initSpeechSynthesisButtons']();
        if ($("#print-page").length > 0) {
          navno[ 'initContentPrintHandler']();
        }
      }
    });
    $('.tts-stop').click(function (e) {
      e.preventDefault();
      if ($('.tts-play').hasClass('play')) {
        $('#tts-group .tts-play').removeClass('play');
        vFact_dostop();
      }
    });
  }
};

navno.initTextToSpeechPanel = function () {
  
  var panel = $('.tts-panel');
  var listenButton = panel.find('button.tts-btn-listen');
  var panelWidth = (listenButton.width()) + 36;
  // Plus padding
  
  var scriptUrl = 'https://speech.leseweb.dk/script/ke857rosk1l7q9llcd0u.js';
  
  listenButton.click(function (e) {
    //e.preventDefault();
    
    var buttonGroup = $('#tts-group');
    buttonGroup.css('left', panelWidth + 'px')
    var trigger = $(this);
    
    
    if (buttonGroup.hasClass('hide')) {
      
      if (trigger.hasClass('tts-btn-collapsed')) {
        trigger.removeClass("tts-btn-collapsed");
      }
      trigger.addClass("tts-btn-expanded")
      buttonGroup.removeClass('hide');
      
      panel.animate({
        width: (panelWidth + 119) + "px"
      },
      {
        duration: "slow",
        
        complete: function () {
          
          var isScriptLoaded = panel.attr('data-scriptenabled');
          
          if (isScriptLoaded === 'false') {
            
            $.getScript(scriptUrl).done(function (script, textStatus) {
              navno[ 'initSpeechSynthesisButtons']();
            }).fail(function (jqxhr, settings, exception) {
            });
            
            panel.attr('data-scriptenabled', 'true');
          }
        }
      });
    } else {
      
      panel.animate({
        width: panelWidth + "px"
      },
      {
        duration: "slow",
        
        complete: function () {
          
          trigger.addClass("tts-btn-collapsed");
          trigger.removeClass("tts-btn-expanded");
          buttonGroup.addClass('hide');
        }
      });
    }
  });
};

$(function () {
  navno[ 'initTextToSpeechPanel']();
});

//////////////////////// END ////////////////////////

/*
 * Rapporthandbok URL oppdatering
 */

$(function () {
  var rates = $("#accordion-rates");
  if (rates.length > 0) {
  
    var link = rates.find('a').first();
    var ajaxSuccess = false;
    var html = null;
    
    var jqxhr = $.ajax({
    
      type: "GET",
      url: link.attr("data-full-url"),
      
      success: function (data) {
        
        html = $.parseHTML(data);
        ajaxSuccess = true;
        
      },
      complete: function () {
        
        if (ajaxSuccess) {
          var fullURL = $(html).find('a').attr("href");
          
          if (fullURL != null && fullURL.length > 0) {
            link.attr('href', fullURL);
          }
        }
      }
    });
  }
});


//////////////////////// END ////////////////////////


/*
 * Mobile submenu for page content (undermeny)
 */

// Accessed by global script. Do nothing on "touchmove"
navno.touchMovedOnArticle = false;

$(function () {
  
  var container = $("#pagecontent .mobile-linklist-related");
  if (container.length > 0) {
    
    var submenu = container.find("nav.init");
    submenu.css("height", 0);
    
    var submenuHeight = submenu.find("ul").height() + 65;
    submenu.removeClass("init");
    
    var touchEventFired = false;
    var touchStartX, touchStartY;
    
    $("#pagecontent").on("touchstart", function (event) {
      var pointer = event.originalEvent.targetTouches ? event.originalEvent.targetTouches[0]: event;
      navno.touchMovedOnArticle = false;
      touchStartX = pointer.clientX;
      touchStartY = pointer.clientY;
    });
    $("#pagecontent").on("touchmove", function (event) {
      var pointer = event.originalEvent.targetTouches ? event.originalEvent.targetTouches[0]: event;
      if (Math.abs(pointer.clientX - touchStartX) > 10 || Math.abs(pointer.clientY - touchStartY) > 10) {
        navno.touchMovedOnArticle = true;
      }
    });
    
    container.find(".submenu-header a").on("touchstart touchend", function (event) {
      event.preventDefault();
      // Need to run preventDefault() on touchstart for FireFox
      
      if (event.type === "touchend" && ! navno.touchMovedOnArticle) {
        var headerLink = $(this);
        var newHeight = container.hasClass("open") ? 0: submenuHeight;
        
        container.toggleClass("open");
        submenu.css("height", newHeight);
        
        setTimeout(function () {
          if (container.hasClass("open")) {
            headerLink.attr("aria-expanded", true).attr("aria-hidden", false);
            submenu.attr("aria-expanded", true).attr("aria-hidden", false);
          } else {
            headerLink.attr("aria-expanded", false).attr("aria-hidden", true);
            submenu.attr("aria-expanded", false).attr("aria-hidden", true);
          }
          
          // Document had its height changed due to dropdown expansion,
          // which changes the offset position of the "go to top" link button.
          // Updating position of this button element below
          navno.buttonBottomOffset = navno.topLinkButtonPlaceholder.offset().top + navno.topLinkButtonPlaceholder.height();
          
          navno[ 'onScrollAndResize']();
          
          var viewPortBottom = $(window).height() + $(window).scrollTop();
          var headerOffsetBottom = headerLink.parent().offset().top + headerLink.parent().height();
          
          if (headerOffsetBottom > viewPortBottom) {
            $('html, body').animate({
              scrollTop: $(window).scrollTop() + 120
            }, {
              duration: 200,
              complete: function () {
              }
            });
          }
        },
        420);
      } else if (event.type === "touchstart") {
        navno.touchMovedOnArticle = false;
      }
    });
  }
});

//////////////////////// END ////////////////////////
/*
 * Deling i sosiale medier
 */

$(function() {

  var title = document.title.replace(" - www.nav.no", "");
  var domain = "nav.no";
  var url = window.location.href; 
  var urls = {
    facebook: "http://www.facebook.com/sharer/sharer.php?u=" + url + "&title=" + encodeURIComponent(title),
    twitter: "http://twitter.com/intent/tweet?text=" + encodeURIComponent(title) + ": " + url,
    linkedin: "http://www.linkedin.com/shareArticle?mini=true&url=" + url + "&title=" + encodeURIComponent(title) + "&source=" + domain
  };

  // SOCIAL MEDIA
  var openWindow = function(e) {

    if(e && e.preventDefault) {
      e.preventDefault()
    }

    var windowWidth = document.documentElement.clientWidth;
    var windowHeight = document.documentElement.clientHeight;

    var width  = 575,
        height = 400,
        left   = (windowWidth  - width)  / 2,
        top    = (windowHeight - height) / 2,
        url    = this.href,
        title  = this.innerHTML, 
        opts   = 'status=1' +
                ',width='  + width  +
                ',height=' + height +
                ',top='    + top    +
                ',left='   + left;
     
     window.open(url, "", opts);
   
  };

  $(".js-share").each(function() {
    var medium = $(this).data("medium");
    var url = urls[medium];
    $(this).attr("href", url);
    $(this).on("click", openWindow); 
  });
   
});
