/*
Copyright © 2013 Adobe Systems Incorporated.

Licensed under the Apache License, Version 2.0 (the “License”);
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an “AS IS” BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/


/*
This script has been modified to fit the needs of NAV (The Norwegian Labour and Welfare Administration), 2013-2014.
Some functions removed, some modified, others added.
Original source: https://github.com/adobe-accessibility/Accessible-Mega-Menu
*/



(function ($, window, document) {

    "use strict";

    var pluginName = "accessibleMegaMenu",
        defaults = {
            uuidPrefix: "accessible-megamenu", // unique ID's are required to indicate aria-owns, aria-controls and aria-labelledby
            menuClass: "accessible-megamenu", // default css class used to define the megamenu styling
            topNavItemClass: "topnavitem", // default css class for a top-level navigation item in the megamenu
            panelClass: "accessible-megamenu-panel", // default css class for a megamenu panel
            panelGroupClass: "accessible-megamenu-panel-group", // default css class for a group of items within a megamenu panel
            hoverClass: "hover", // default css class for the hover state
            focusClass: "focus", // default css class for the focus state
            openClass: "open", // default css class for the open state
            selectedTopNavItem: "selected-topnavitem", // Custom class for highlighting active menu branch
            jsAnimatedClass: "js-animated", // custom class for toggling subnav visibility depending on state of CSS transition
            jsMenuExpandedClass: "js-menu-expanded", // custom class for controlling the collapse / expand css transition
            enableMobileMenu: false
        },
        Keyboard = {
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
        
    /**
     * @desc Creates a new accessible mega menu instance.
     * @param {jquery} element
     * @param {object} [options] Mega Menu options
     * @param {string} [options.uuidPrefix=accessible-megamenu] - Prefix for generated unique id attributes, which are required to indicate aria-owns, aria-controls and aria-labelledby
     * @param {string} [options.menuClass=accessible-megamenu] - CSS class used to define the megamenu styling
     * @param {string} [options.topNavItemClass=accessible-megamenu-top-nav-item] - CSS class for a top-level navigation item in the megamenu
     * @param {string} [options.panelClass=accessible-megamenu-panel] - CSS class for a megamenu panel
     * @param {string} [options.panelGroupClass=accessible-megamenu-panel-group] - CSS class for a group of items within a megamenu panel
     * @param {string} [options.hoverClass=hover] - CSS class for the hover state
     * @param {string} [options.focusClass=focus] - CSS class for the focus state
     * @param {string} [options.openClass=open] - CSS class for the open state
     * @constructor
     */
      function AccessibleMegaMenu(element, options) {
        this.element = element;
        
        // merge optional settings and defaults into settings
        this.settings = $.extend({}, defaults, options);
        
        this._defaults = defaults;
        this._name = pluginName;
        
        this.init();
    }
    

    AccessibleMegaMenu.prototype = (function () {

        /* private attributes and methods ------------------------ */
        var uuid = 0,
            keydownTimeoutDuration = 1000,
            keydownSearchString = "",
            isTouch = !!Object.prototype.hasOwnProperty.call(window, "ontouchstart"),// !!window.hasOwnProperty("ontouchstart"),       
            mobileMenuMq = window.matchMedia("(max-width: 48em)"), // Mobile
            _getPlugin,
            _addUniqueId,
            _togglePanel,
            _clickHandler,
            _clickOutsideHandler,
            _keyDownHandler,
            _toggleExpandedEventHandlers,    
            _mobileMenuInit,
            _mobileMenuEnable,
            _mobileMenuDisable,
            _toggleMobilePanel,
            _toggleMobileMenuAndSearch,     
            _getFooterLinks, // custom func
            _splitListItems, // custom func
            _getTouchEvent = function(event) {
                      return event.originalEvent.targetTouches ? event.originalEvent.targetTouches[0] : event;
                    };
        

        _mobileMenuEnable = function (submenu,expander) {

            expander.attr({
                "tabindex":     0,
                "aria-haspopup": true,
                "aria-owns": submenu.attr("id"),
                "aria-controls": submenu.attr("id"),
                "aria-expanded": false
            });
        
            submenu.attr({
                "role": "group",
                "aria-expanded": false,
                "aria-hidden": true
            })
                .not("[aria-labelledby]")
                .attr("aria-labelledby", expander.attr("id"));
        } 

        _mobileMenuDisable = function (submenu,expander) {

            expander.removeAttr('tabindex aria-haspopup aria-owns aria-controls aria-expanded');
            submenu.removeAttr('role aria-expanded aria-hidden aria-labelledby');
        }   

     
        _mobileMenuInit = function (mobilesubmenus) {  

          var that = this,
          settings = this.settings,
          nav = this.nav,
          menu = this.menu,
          menutoggler = nav.find('#toggle-mobile-mainmenu'),
          searchform = nav.find('#sitesearch'),
          searchtoggler = nav.find('#toggle-mobile-search');

             mobileMenuMq.addListener(function() {

              if (mobileMenuMq.matches) { // mobil

                $(nav).find('button.mobile-toggler').attr({              
                "aria-hidden": false
              });

                _mobileMenuEnable.call(this,menu,menutoggler);
                _mobileMenuEnable.call(this,searchform,searchtoggler);

                  mobilesubmenus.each(function (i, submenu) {   
                  /*Make headings clickable */            
                        submenu = $(submenu);

                        var expander = submenu.prevAll('.mobile-submenu-expander').eq(0); // todo defaults                                            
                            if (!expander.attr('tabindex')) {
                            _mobileMenuEnable.call(this,submenu,expander);
                            }
                    });


              }

              else { // desktop

                $(nav).find('.mobile-toggler').attr({              
                "aria-hidden": true
              });

               _mobileMenuDisable.call(this,menu,menutoggler);
               _mobileMenuDisable.call(this,searchform,searchtoggler);

                 mobilesubmenus.each(function (i, submenu) {   // todo: nødvendig med each her?
                  /*Make headings clickable */            
                        submenu = $(submenu);
                        var expander = submenu.prevAll('.mobile-submenu-expander').eq(0); // todo defaults                         

                            if (expander.attr('tabindex')) {
                              _mobileMenuDisable.call(this,submenu,expander);
                            }
                    });

              }
  
             });
        }

         _toggleMobilePanel = function (event,hide) { // handler for mobile "extra" links

            var target = $(event.target),
                that = this,
                settings = that.settings,
                menu = that.menu,
                openMobilePanels = menu.find('.mobile-submenu-expander.' + settings.openClass).not(target);

                if (hide) {
                  target.attr('aria-expanded', 'false')
                        .removeClass(settings.openClass)
                        .siblings('ul').attr('aria-expanded', 'false')
                        .attr('aria-hidden', 'true')
                        .removeClass(settings.openClass);                        
                }
                else {
                  openMobilePanels.attr('aria-expanded', 'false')
                        .removeClass(settings.openClass)
                        .siblings('ul').attr('aria-expanded', 'false')
                        .attr('aria-hidden', 'true')
                        .removeClass(settings.openClass);

                  target.attr('aria-expanded', 'true')
                        .addClass(settings.openClass)
                        .siblings('ul').attr('aria-expanded', 'true')
                        .attr('aria-hidden', 'false')
                        .addClass(settings.openClass);
                }

         }



        _splitListItems = function (element, list) {   // handeling browsers where css columns not supported
            var capacity = 40,
                i = 0,
                countToTen = 0, // number of links per col
                currentULposition = 0,
                hits = list.find('li'),
                numRows = Math.ceil(hits.length / 10);
            
            for (var c = 0; c < numRows; c++) {
              element.append('<div class="footer-col"><ul></ul></div>');
            }
            
            var ulColList = element.find('ul');

            $(hits).each(function () {
              
              if (i <= capacity) {
                
                if (countToTen < 10 && currentULposition < 4) {
                  
                  ulColList[currentULposition].appendChild($(this)[0]);
                  
                  i++;
                  countToTen++;
                } else if (countToTen > 9) {
                  
                  currentULposition++; // Next columns of links
                  ulColList[currentULposition].appendChild($(this)[0]);
                  
                  // Set to 1 because the first one has already been added above
                  countToTen = 1; // reset, counting 10 links pr. column.
                  i++;
                }
              }
            });

        };

          _getFooterLinks = function (element) {
            
            var topli = element,
                target = topli.find("a:first"), 
                href = target.attr('href'),
                panel = topli.find('.accessible-megafooter-panel');

            if (!panel.find('ul').length > 0) {
            
            target.attr('aria-busy', 'true');
            panel.append('<div class="spinner"></div>');

            var jqxhr = $.ajax({
              type: "GET",
              url: href
            })

            .always(function () {
              target.attr('aria-busy', 'false');
              panel.find('.spinner').remove();
              panel.find('p').remove(); // feilmelding

            })

            .fail(function() {
              window.location = href;
            })

            .done(function (msg) { // todo error handling?
              var html = $.parseHTML(msg),
                  list = $('#content-a-z', html).find('ul');

                  if (list.length > 0) {

                  if (!$('html').hasClass('no-csscolumns')) { // modernizr dependent
                  list.removeClass().addClass('footer-columns').appendTo(panel); // menu-link-list footer-columns
                  
                  }
                  else { // special handling if no csscolumns support
                  _splitListItems(panel,list);
                  }

                  }

                  else {
                    panel.append('<p>Fant ikke innhold</p>');
                  } 
            });
            
          }// if content is not allready loaded


           setTimeout(function() {
            var scrollTarget = $(window).scrollTop() + $(window).height(),
                offset = topli.offset().top,
                distanceFromFold = scrollTarget - offset;

                if (distanceFromFold < 300) { // scroll down to link list if A-Z is close to the fold
                  $('html,body').animate({
                  scrollTop: $(window).scrollTop() + (300 - distanceFromFold)
               });
                }
              
            }, 500);
          };


        /**
         * @name jQuery.fn.accessibleMegaMenu~_getPlugin
         * @desc Returns the parent accessibleMegaMenu instance for a given element
         * @param {jQuery} element
         * @memberof jQuery.fn.accessibleMegaMenu
         * @inner
         * @private
         */
         _getPlugin = function (element) {
            return $(element).closest(':data(plugin_' + pluginName + ')').data("plugin_" + pluginName);
        };
        
        /**
         * @name jQuery.fn.accessibleMegaMenu~_addUniqueId
         * @desc Adds a unique id and element.
         * The id string starts with the 
         * string defined in settings.uuidPrefix.
         * @param {jQuery} element
         * @memberof jQuery.fn.accessibleMegaMenu
         * @inner
         * @private
         */
         _addUniqueId = function (element) {
            element = $(element);
            var settings = this.settings;
            if (!element.attr("id")) {
                element.attr("id", settings.uuidPrefix + "-" + new Date().getTime() + "-" + (++uuid));
            }
        };
        
        /**
         * @name jQuery.fn.accessibleMegaMenu~_togglePanel
         * @desc Toggle the display of mega menu panels in response to an event.
         * The optional boolean value 'hide' forces all panels to hide.
         * @param {event} event
         * @param {Boolean} [hide] Hide all mega menu panels when true
         * @memberof jQuery.fn.accessibleMegaMenu
         * @inner
         * @private
         */

        _togglePanel = function (event, hide) {
            var target = $(event.target),
                that = this,
                settings = this.settings,
                menu = this.menu,
                topli = target.closest('.' + settings.topNavItemClass),
                panel = target.hasClass(settings.panelClass) ? target : target.closest('.' + settings.panelClass);

            _toggleExpandedEventHandlers.call(this, hide);

            if (!menu.hasClass('m-open')) { // listener kjører til mobilmeny er lukka
            $('html').off('mouseup.outside-accessible-megamenu, touchend.outside-accessible-megamenu, mspointerup.outside-accessible-megamenu, pointerup.outside-accessible-megamenu', _clickOutsideHandler);
            }

            if (hide) {
                topli = menu.find('.' + settings.topNavItemClass + ' .' + settings.openClass + ':first').closest('.' + settings.topNavItemClass);

                    topli.find('[aria-expanded]')
                        .attr('aria-expanded', 'false')
                        .removeClass(settings.openClass)
                        .filter('.mobile-submenu, .' + settings.panelClass)
                        .attr('aria-hidden', 'true');

                   that.animTimeoutID = setTimeout(function(){
                      topli.find('.' +settings.jsAnimatedClass).removeClass(settings.jsAnimatedClass);

                     },300);   // css animation time is 500
                
                menu.removeClass(settings.jsMenuExpandedClass); // animate up // custom
             
            } 
            else { // show
                clearTimeout(that.focusTimeoutID);
                clearTimeout(that.animTimeoutID);

               var footerLinksContainer = topli.find('.accessible-megafooter-panel');

                if (footerLinksContainer.length > 0) {
                     if (!footerLinksContainer.hasClass('content-loaded')) {
                          _getFooterLinks (topli); 
                       }
            
                }

                topli.siblings().removeClass(settings.selectedTopNavItem)
                    .find('[aria-expanded]')
                    .attr('aria-expanded', 'false')
                    .removeClass(settings.openClass)
                    .removeClass(settings.jsAnimatedClass) // custom
                    .filter('.mobile-submenu, .' + settings.panelClass)
                    .attr('aria-hidden', 'true');
                topli.addClass(settings.selectedTopNavItem).find('[aria-expanded]').not('.mobile-submenu-expander, .mobile-submenu')
                    .attr('aria-expanded', 'true')
                    .addClass(settings.openClass)
                    .addClass(settings.jsAnimatedClass) // custom
                    .filter('.' + settings.panelClass)
                    .attr('aria-hidden', 'false');              

                 menu.addClass(settings.jsMenuExpandedClass); // animate down // custom

                 _toggleExpandedEventHandlers.call(that);
            }
        };


        _toggleMobileMenuAndSearch = function (event,hide) {

          var target = $(event.target),
              that = this,
              settings = this.settings,
              nav = this.nav,
              menu = this.menu,
              togglers = nav.find('button.mobile-toggler');

          _toggleExpandedEventHandlers.call(this, hide);
           
          $('html').off('mouseup.outside-accessible-megamenu, touchend.outside-accessible-megamenu, mspointerup.outside-accessible-megamenu, pointerup.outside-accessible-megamenu', _clickOutsideHandler);

          if (hide) { // True ved klikk på knapp som er .m-open, eller ved kjøring av clickOutsideHandler

              togglers.removeClass('m-open').attr('aria-expanded', false);           
              menu.add('#sitesearch').removeClass('m-open')
                .attr({
                  "aria-expanded": false,
                  "aria-hidden": true
                });
          }


          else { // open one panel, close the other (searchform vs menu)
 
            target.addClass('m-open').attr('aria-expanded', true)
                  .siblings('button.mobile-toggler')
                  .removeClass('m-open')
                  .attr('aria-expanded', false);         

            $('#' +target.attr('aria-controls')).addClass('m-open')
                    .attr({
                      'aria-expanded': true,
                      'aria-hidden': false
                    });

            $('#' +target.siblings('button.mobile-toggler').attr('aria-controls')).removeClass('m-open')
                    .attr({
                      'aria-expanded': false,
                      'aria-hidden': true
                    });

            _toggleExpandedEventHandlers.call(that);

          }  
      
         }
        
        /**
         * @name jQuery.fn.accessibleMegaMenu~_clickHandler
         * @desc Handle click event on mega menu item
         * @param {event} Event object
         * @memberof jQuery.fn.accessibleMegaMenu
         * @inner
         * @private
         */
         _clickHandler = function (event) {
            var target = $(event.target),                        
                topli = target.closest('.' + this.settings.topNavItemClass),
                toplink = topli.find('a:first'), // top nav item link
                panel = target.closest('.' + this.settings.panelClass);    

    

                if (target.is('a > span')) { // Språkvalg i mobilmeny
                  target = target.parent('a');
                }


            if (topli.length === 1
                    && panel.length === 0
                    && topli.find('.' + this.settings.panelClass).length === 1
                    && target[0] === toplink[0]) {

                      event.preventDefault(); // main menu item
                      event.stopPropagation();

                 if (!target.hasClass(this.settings.openClass)) {
                    _togglePanel.call(this, event);

                } else {
                   _togglePanel.call(this, event, target.hasClass(this.settings.openClass));

                }
            }

            else if (target.is('[tabindex].mobile-submenu-expander')) { // tabindex kun hvis mobil layout

              event.preventDefault();
              event.stopPropagation();            
              
               if (!target.hasClass(this.settings.openClass)) {
                    _toggleMobilePanel.call(this, event);

                } else {
                   _toggleMobilePanel.call(this, event, true);
                   
                }
              
            }

           else if (target.is('button.mobile-toggler')) {

              if (!target.is('.m-open')) {
                    _toggleMobileMenuAndSearch.call(this, event);

                } else {
                   _toggleMobileMenuAndSearch.call(this, event, true);
                   
                }        
            }

        };
        
        /**
         * @name jQuery.fn.accessibleMegaMenu~_clickOutsideHandler
         * @desc Handle click event outside of a the megamenu
         * @param {event} Event object
         * @memberof jQuery.fn.accessibleMegaMenu
         * @inner
         * @private
         */
         _clickOutsideHandler = function (event) {  

          var target = $(event.target);

          if ((window.navigator.msPointerEnabled || window.navigator.pointerEnabled) && target.context.localName === 'html') {
            // hindre windows phone i å lukke mobilmeny på scroll / touchmove / mspointermove
            // IE10 bruker msPointerEnabled. IE11 bruker pointerEnabled

            return false; 
          }


            if (this.interactiveArea.has(target).length === 0 && this.mobileMenuTogglers.filter(target).length === 0) {

                event.preventDefault();
                event.stopPropagation();
                
                 _togglePanel.call(this, event, true);               
     
                 if (this.settings.enableMobileMenu && this.nav.has('.m-open').length) {
                  _toggleMobileMenuAndSearch.call(this, event, true);

                }

            }
  
        };

        /**
         * @name jQuery.fn.accessibleMegaMenu~_keyDownHandler
         * @desc Handle keydown event on mega menu.
         * @param {event} Event object
         * @memberof jQuery.fn.accessibleMegaMenu
         * @inner
         * @private
         */
        _keyDownHandler = function (event) {
            var target = $($(this).is('.hover:tabbable') ? this : event.target),
                that = target.is(event.target) ? this : _getPlugin(target),
                settings = that.settings,
                menu = that.menu,
                topnavitems = that.topnavitems,
                topli = target.closest('.' + settings.topNavItemClass),
                tabbables = menu.find(':tabbable'),
                panel = target.hasClass(settings.panelClass) ? target : target.closest('.' + settings.panelClass),
                panelGroups = panel.find('.' + settings.panelGroupClass),
                currentPanelGroup = target.closest('.' + settings.panelGroupClass),
                next,
                keycode = event.keyCode || event.which,
                start,
                i,
                o,
                label,
                found = false,
                newString = Keyboard.keyMap[event.keyCode] || '',
                regex,
                isTopNavItem = (topli.length === 1 && panel.length === 0),
                isMobileSubmenuExpander = target.is('.mobile-submenu-expander');

            if ($(event.target).is('input')) {
              return true;
            }

            if (target.is('.hover:tabbable')) { // todo - kan fjernes?
                $('html').off('keydown.accessible-megamenu');
            }

            switch (keycode) {
            case Keyboard.ESCAPE:
                _togglePanel.call(that, event, true);
                break;
            
            case Keyboard.DOWN:
                event.preventDefault();
                if (isTopNavItem) {
                    _togglePanel.call(that, event);
                   
                var fixClippingBug = setTimeout(function () {
                      // Prevent clipping bug on arrow down & animation start // custom
                     found = (topli.find('.' + settings.panelClass + ' :tabbable:first').focus().length === 1);
                }, 100); 

                } else {
                    found = (tabbables.filter(':gt(' + tabbables.index(target) + '):first').focus().length === 1);
                }
                
                if (!found && window.opera && opera.toString() === "[object Opera]" && (event.ctrlKey || event.metaKey)) {
                    tabbables = $(':tabbable');
                    i = tabbables.index(target);
                    found = ($(':tabbable:gt(' + $(':tabbable').index(target) + '):first').focus().length === 1);
                }
                break;

            case Keyboard.UP:
                event.preventDefault();
                if (isTopNavItem && target.hasClass(settings.openClass)) {
                    _togglePanel.call(that, event, true);
                    next = topnavitems.filter(':lt(' + topnavitems.index(topli) + '):last');
                    if (next.children('.' + settings.panelClass).length) {
                        found = (next.children()
                            .attr('aria-expanded', 'true')
                            .addClass(settings.openClass)
                            .filter('.' + settings.panelClass)
                            .attr('aria-hidden', 'false')
                            .find(':tabbable:last')
                            .focus() === 1);
                    }
                } else if (!isTopNavItem) {
                    found = (tabbables.filter(':lt(' + tabbables.index(target) + '):last').focus().length === 1);
                }
                    
                if (!found && window.opera && opera.toString() === "[object Opera]" && (event.ctrlKey || event.metaKey)) {
                    tabbables = $(':tabbable');
                    i = tabbables.index(target);
                    found = ($(':tabbable:lt(' + $(':tabbable').index(target) + '):first').focus().length === 1);
                }
                break;

            case Keyboard.RIGHT:
                event.preventDefault();
                if (isTopNavItem) {
                    found = (topnavitems.filter(':gt(' + topnavitems.index(topli) + '):first').find(':tabbable:first').focus().length === 1);
                } else {
                    if (panelGroups.length && currentPanelGroup.length) {
                        // if the current panel contains panel groups, and we are able to focus the first tabbable element of the next panel group
                        found = (panelGroups.filter(':gt(' + panelGroups.index(currentPanelGroup) + '):first').find(':tabbable:first').focus().length === 1);
                    }
                    
                    if (!found) {
                        found = (topli.find(':tabbable:first').focus().length === 1);
                    }
                }
                break;

            case Keyboard.LEFT:
                event.preventDefault();
                if (isTopNavItem) {
                    found = (topnavitems.filter(':lt(' + topnavitems.index(topli) + '):last').find(':tabbable:first').focus().length === 1);
                } else {
                    if (panelGroups.length && currentPanelGroup.length) {
                        // if the current panel contains panel groups, and we are able to focus the first tabbable element of the previous panel group
                        found = (panelGroups.filter(':lt(' + panelGroups.index(currentPanelGroup) + '):last').find(':tabbable:first').focus().length === 1);
                    }
                    
                    if (!found) {
                        found = (topli.find(':tabbable:first').focus().length === 1);
                    }
                }
                break;

            case Keyboard.TAB:
                i = tabbables.index(target);
                if (event.shiftKey && isTopNavItem && target.hasClass(settings.openClass)) {
                   /* _togglePanel(event, true);
                    next = topnavitems.filter(':lt(' + topnavitems.index(topli) + '):last');
                    if (next.children('.' + settings.panelClass).length) {
                        found = next.children()
                            .attr('aria-expanded', 'true')
                            .addClass(settings.openClass)
                            .filter('.' + settings.panelClass)
                            .attr('aria-hidden', 'false')
                            .find(':tabbable:last')
                            .focus();
                    }*/
                } else if (event.shiftKey && i > 0) {
                    found = (tabbables.filter(':lt(' + i + '):last').focus().length === 1);
                } else if (!event.shiftKey && i < tabbables.length - 1) {
                    found = (tabbables.filter(':gt(' + i + '):first').focus().length === 1);
                } else if (window.opera && opera.toString() === "[object Opera]") {
                    tabbables = $(':tabbable');
                    i = tabbables.index(target);
                    if (event.shiftKey) {
                        found = ($(':tabbable:lt(' + $(':tabbable').index(target) + '):last').focus().length === 1);
                    } else {
                        found = ($(':tabbable:gt(' + $(':tabbable').index(target) + '):first').focus().length === 1);
                    }
                }
                
                if (found) {
                    event.preventDefault();
                }
                break;

            case Keyboard.SPACE:

                if (isTopNavItem || isMobileSubmenuExpander) {
                    event.preventDefault();
                    _clickHandler.call(that, event);
                }
                break;

            default:
                // alphanumeric filter  

                if (isMobileSubmenuExpander && Keyboard.ENTER) {
                  event.preventDefault();
                  _clickHandler.call(that, event);
                }  

                clearTimeout(this.keydownTimeoutID);
                keydownSearchString += newString !== keydownSearchString ? newString : '';
                
                if (keydownSearchString.length === 0) {
                    return;
                }
                
                this.keydownTimeoutID = setTimeout(function () {
                    keydownSearchString = '';
                }, keydownTimeoutDuration);

                if (isTopNavItem && !target.hasClass(settings.openClass)) {
                    tabbables = tabbables.filter('.' + settings.topNavItemClass + ' > :tabbable');
                } else {
                    tabbables = topli.find(':tabbable');
                }

                if (event.shiftKey) {
                    tabbables = $(tabbables.get()
                        .reverse());
                }

                for (i = 0; i < tabbables.length; i++) {
                    o = tabbables.eq(i);
                    if (o.is(target)) {
                        start = (keydownSearchString.length === 1) ? i + 1 : i;
                        break;
                    }
                }
                
                regex = new RegExp('^' + keydownSearchString.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g, '\\$&'), 'i');
                    
                for (i = start; i < tabbables.length; i++) {
                    o = tabbables.eq(i);
                    label = $.trim(o.text());
                    if (regex.test(label)) {
                        found = true;
                        o.focus();
                        break;
                    }
                }
                if (!found) {
                    for (i = 0; i < start; i++) {
                        o = tabbables.eq(i);
                        label = $.trim(o.text());
                        if (regex.test(label)) {
                            o.focus();
                            break;
                        }
                    }
                }
                break;
            }
            that.justFocused = false;
        };

         _toggleExpandedEventHandlers = function (hide) {
            var menu = this.menu;

            if (hide && !menu.hasClass('m-open')) {
                $('html').off('mouseup.outside-accessible-megamenu, touchend.outside-accessible-megamenu, mspointerup.outside-accessible-megamenu,  pointerup.outside-accessible-megamenu', _clickOutsideHandler);

            } else {
                $('html').on('mouseup.outside-accessible-megamenu, touchend.outside-accessible-megamenu, mspointerup.outside-accessible-megamenu,  pointerup.outside-accessible-megamenu', $.proxy(_clickOutsideHandler, this));

                 }
        };
        
         /* public attributes and methods ------------------------- */
        return {
            constructor: AccessibleMegaMenu,
            
            /**
             * @lends jQuery.fn.accessibleMegaMenu
             * @desc Initializes an instance of the accessibleMegaMenu plugins
             * @memberof jQuery.fn.accessibleMegaMenu
             * @instance
             */
            init: function () {
                var that = this,
                    settings = this.settings,
                    justFocused = this.justFocused = false,
                    nav = this.nav = $(this.element),
                    menu = this.menu = nav.find('ul').first(),
                    mobileMenuTogglers = this.mobileMenuTogglers = nav.find('button.mobile-toggler'),
                    interactiveArea = this.interactiveArea = settings.enableMobileMenu ? menu.add(mobileMenuTogglers).add($('#sitesearch')) : menu,
                    topnavitems = this.topnavitems = menu.children(); // <li>

                var touchMoved = false,
                    touchEventFired = false,
                    touchStartX =  0,
                    touchStartY = 0;

                topnavitems.each(function (i, topnavitem) {
                    var topnavitemlink, topnavitempanel;
                    topnavitem = $(topnavitem);
                    topnavitem.addClass(settings.topNavItemClass);
                    topnavitemlink = topnavitem.find("a:first"); //topnavitem.find(":tabbable:first");
                    topnavitempanel = topnavitem.find('.panel-wrapper').children(":not(:tabbable):last"); // todo: fix selector (not using .panel-wrapper) // defaults                      

                    _addUniqueId.call(that, topnavitemlink);
                    if (topnavitempanel.length) {
                        _addUniqueId.call(that, topnavitempanel);
                        topnavitemlink.attr({
                            "aria-haspopup": true,
                            "aria-owns": topnavitempanel.attr("id"),
                            "aria-controls": topnavitempanel.attr("id"),
                            "aria-expanded": false
                        });

                        topnavitempanel.attr({
                            "role": "group",
                            "aria-expanded": false,
                            "aria-hidden": true
                        })
                            .addClass(settings.panelClass)
                            .not("[aria-labelledby]")
                            .attr("aria-labelledby", topnavitemlink.attr("id"));
                    }
                }); // each end

                if (settings.enableMobileMenu) {

                    var mobilesubmenus = topnavitems.find('.mobile-submenu:not(.languages)');

                    if (mobileMenuMq.matches) {
    
                     $(nav).find('button.mobile-toggler').attr({              
                    "aria-hidden": false
                  });

                     $(nav).find('label.mobile-toggler, input.mobile-toggler').attr({              
                    "aria-hidden": true
                  });

                    _mobileMenuEnable.call(that,menu,$('#toggle-mobile-mainmenu'));
                    _mobileMenuEnable.call(that,$('#sitesearch'),$('#toggle-mobile-search'));
                    }

                    else {
                      $(nav).find('.mobile-toggler').attr({              
                    "aria-hidden": true
                  });
                    }

                     mobilesubmenus.each(function (i, submenu) {               
                        submenu = $(submenu);
                        var expander = submenu.prevAll('.mobile-submenu-expander').eq(0); // todo defaults  
                        
                        _addUniqueId.call(that, submenu); 
                        _addUniqueId.call(that, expander);
                        
                        if (mobileMenuMq.matches) {
                        _mobileMenuEnable.call(that,submenu,expander);

                        }
            
                    });

                    _mobileMenuInit.call(that, mobilesubmenus);
                }
                                          
                    if (isTouch) {
                      interactiveArea.on('touchstart.accessible-megamenu', function(e) {
                          var pointer = _getTouchEvent(e);
                          touchMoved = false;
                          touchStartX = pointer.clientX;
                          touchStartY = pointer.clientY;

                      }).on('touchmove.accessible-megamenu', function(e) {                       
                            var pointer = _getTouchEvent(e);
                            if (Math.abs(pointer.clientX - touchStartX) > 10 || Math.abs(pointer.clientY - touchStartY) > 10) {
                            touchMoved = true;
                            }
                      }).on('touchend.accessible-megamenu', function(e) {

                          if (!touchMoved) {
                            touchEventFired = true; // set flag
   
                          }

                          else {
         
                            e.stopImmediatePropagation(); // Move detected! Skip the following event handlers (Don't call _clickHandler)
                          }

                      }).on('touchend.accessible-megamenu', $.proxy(_clickHandler, this))
                        .on('click.accessible-megamenu', function(e) {


                         var target = $(e.target);

                          if (touchEventFired && !target.is('a:not([aria-expanded])') && !target.is('input')) { // don't do preventDefault if target is a normal link, or search input

                            e.preventDefault(); // Don't follow link
                            e.stopImmediatePropagation(); // stop _clickHandler from running twice (abort the next click handler)
                          }
                        }).on('click.accessible-megamenu', $.proxy(_clickHandler, this));
                    
                    } // if isTouch


                    else {    // not a touch device   
                      interactiveArea.on("click.accessible-megamenu", $.proxy(_clickHandler, this));
                    }
             
                    interactiveArea.on("keydown.accessible-megamenu", $.proxy(_keyDownHandler, this));

            },
            
            /**
             * @desc Get default values
             * @example $(selector).accessibleMegaMenu("getDefaults");
             * @return {object}
             * @memberof jQuery.fn.accessibleMegaMenu
             * @instance
             */
            getDefaults: function () {
                return this._defaults;
            },
            
            /**
             * @desc Get any option set to plugin using its name (as string)
             * @example $(selector).accessibleMegaMenu("getOption", some_option);
             * @param {string} opt
             * @return {string}
             * @memberof jQuery.fn.accessibleMegaMenu
             * @instance
             */
            getOption: function (opt) {
                return this.settings[opt];
            },
            
            /**
             * @desc Get all options
             * @example $(selector).accessibleMegaMenu("getAllOptions");
             * @return {object}
             * @memberof jQuery.fn.accessibleMegaMenu
             * @instance
             */
            getAllOptions: function () {
                return this.settings;
            },
            
            /**
             * @desc Set option
             * @example $(selector).accessibleMegaMenu("setOption", "option_name",  "option_value",  reinitialize);
             * @param {string} opt - Option name
             * @param {string} val - Option value
             * @param {boolean} [reinitialize] - boolean to re-initialize the menu.
             * @memberof jQuery.fn.accessibleMegaMenu
             * @instance
             */
            setOption: function (opt, value, reinitialize) {
                this.settings[opt] = value;
                if (reinitialize) {
                    this.init();
                }
            }
        };
    }());
        
    /* lightweight plugin wrapper around the constructor, 
       to prevent against multiple instantiations */
       
    /**
     * @param {object} [options] Mega Menu options
     * @param {string} [options.uuidPrefix=accessible-megamenu] - Prefix for generated unique id attributes, which are required to indicate aria-owns, aria-controls and aria-labelledby
     * @param {string} [options.menuClass=accessible-megamenu] - CSS class used to define the megamenu styling
     * @param {string} [options.topNavItemClass=accessible-megamenu-top-nav-item] - CSS class for a top-level navigation item in the megamenu
     * @param {string} [options.panelClass=accessible-megamenu-panel] - CSS class for a megamenu panel
     * @param {string} [options.panelGroupClass=accessible-megamenu-panel-group] - CSS class for a group of items within a megamenu panel
     * @param {string} [options.hoverClass=hover] - CSS class for the hover state
     * @param {string} [options.focusClass=focus] - CSS class for the focus state
     * @param {string} [options.openClass=open] - CSS class for the open state
     */
    $.fn[pluginName] = function (options) {
        return this.each(function () {
            if (!$.data(this, "plugin_" + pluginName)) {
                $.data(this, "plugin_" + pluginName, new AccessibleMegaMenu(this, options));
            }
        });
    };
        
    /* :focusable and :tabbable selectors from 
       https://raw.github.com/jquery/jquery-ui/master/ui/jquery.ui.core.js */
        
    /**
     * @private
     */
    function visible(element) {
        return $.expr.filters.visible(element) && !$(element).parents().addBack().filter(function () {
            return $.css(this, "visibility") === "hidden";
        }).length;
    }
        
    /**
     * @private
     */
    function focusable(element, isTabIndexNotNaN) {
        var map, mapName, img,
            nodeName = element.nodeName.toLowerCase();
        if ("area" === nodeName) {
            map = element.parentNode;
            mapName = map.name;
            if (!element.href || !mapName || map.nodeName.toLowerCase() !== "map") {
                return false;
            }
            img = $("img[usemap=#" + mapName + "]")[0];
            return !!img && visible(img);
        }
        return (/input|select|textarea|button|object/.test(nodeName) ? !element.disabled :
                "a" === nodeName ?
                        element.href || isTabIndexNotNaN :
                        isTabIndexNotNaN) &&
                            // the element and all of its ancestors must be visible
                            visible(element);
    }
        
    $.extend($.expr[":"], {
        data: $.expr.createPseudo ? $.expr.createPseudo(function (dataName) {
            return function (elem) {
                return !!$.data(elem, dataName);
            };
        }) : // support: jQuery <1.8
                function (elem, i, match) {
                    return !!$.data(elem, match[3]);
                },
    
        focusable: function (element) {
            return focusable(element, !isNaN($.attr(element, "tabindex")));
        },
    
        tabbable: function (element) {
            var tabIndex = $.attr(element, "tabindex"),
                isTabIndexNaN = isNaN(tabIndex);
            return (isTabIndexNaN || tabIndex >= 0) && focusable(element, !isTabIndexNaN);
        }
    });
}(jQuery, window, document));




$(document).ready(function () {

    $('#mainmenu').accessibleMegaMenu({
        enableMobileMenu: true
    });
    $('#footer-content-menu').accessibleMegaMenu({
        uuidPrefix: "accessible-megafooter", // unique ID's are required to indicate aria-owns, aria-controls and aria-labelledby
        menuClass: "accessible-megafooter", // default css class used to define the megamenu styling
        topNavItemClass: "letter", // default css class for a top-level navigation item in the megamenu
        panelClass: "accessible-megafooter-panel",
        selectedTopNavItem: "selected-letter"
    });
        
});