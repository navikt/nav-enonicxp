/*
*
*
*   VELG SKJEMA + VELG VEDLEGG
*
*
* */

navno.equalHeight = function(elements) {
    // Finner høyeste element, og bruker den høyden på alle
    // Fiks for IE9 o.l hvor flexbox (CSS) ikke støttes.
    var maxHeight = Math.max.apply(null, elements.map(function () {
        return $(this).outerHeight();
        })),
        maxHeightEm = maxHeight / 16;

    elements.css('height', maxHeightEm + 'em');

}


 $(function () {

   //
   // Velg emne (flexbox-fix for IE9)
   //

   var noFlex = $('.no-flexbox'),
       mq = window.matchMedia("(min-width: 48.0652em)"); // større enn stående pad

   if (noFlex && mq.matches) {

    var equalHeightElements = noFlex.find('.hero-blocks.multiple .hero-block');

     if (equalHeightElements) {
         navno.equalHeight(equalHeightElements);
     }
   }

    //
    // Velg vedlegg:
    //

    var attachmentWrappers = $('.attachment-wrapper'),
        _toggleAttachmentWrapper;


    _toggleAttachmentWrapper = function(event) {

        var target = $(event.target),
            wrapper = target.closest('.attachment-wrapper'),
            collapsible = wrapper.find('.collapsible'),
            flipp = wrapper.find('.flipp');

        if (target.is('.flipp')) {
            event.preventDefault();
        }

        wrapper.toggleClass('illuminated expanded');
        flipp.toggleClass('open');
        collapsible.toggleClass('js-collapsed');

        if (!wrapper.hasClass('expanded')) {
            flipp.attr({
                'aria-expanded': 'false'
            });
            collapsible.attr({
                'aria-hidden': 'true',
                'aria-expanded': 'false'
            });
        }
        else {
            flipp.attr({
                'aria-expanded': 'true'
            });
            collapsible.attr({
                'aria-hidden': 'false',
                'aria-expanded': 'true'
            });

            /*if (target.is('.flipp')) {
                collapsible.focus();
                window.location.hash = collapsible.attr('id');
            }*/

        }

    };


   $('.attachment-wrapper input:enabled').on('click', function(event) {
       var input = $(this),
           wrapper = input.closest('.attachment-wrapper');

       event.stopPropagation();

       if (input.prop('checked') && !wrapper.hasClass('expanded')) {
           // input.prop('checked') = true! Blir true i det en klikker på den. False i det en unchecker.
           _toggleAttachmentWrapper(event);
       }

   });

    $('.attachment-wrapper input:enabled + label').on('click', function(event) {
        var label = $(this),
            input = $('input#' + label.attr('for')),
            wrapper = input.closest('.attachment-wrapper');

        event.stopPropagation();
        event.preventDefault();

        if (!input.prop('checked') && !wrapper.hasClass('expanded')) {
            // input.prop('checked') = false! Når en klikker label trigges det i etterkant et klikk på input. Input er derfpr IKKE checked i det en klikker på label,

            _toggleAttachmentWrapper(event);
        }

        input.prop('checked', !input.prop('checked')); // toggle checked vs not checked, må gjøres manuelt pga preventDefault over.

    });


    $('.attachment-wrapper').on('click', function(event) {

        _toggleAttachmentWrapper(event);

    });


    //
    // ARIA initial setup for "velg-vedlegg"
    //

    attachmentWrappers.each(function () {
        var current = $(this),
            collapsible = current.find('.collapsible'),
            flipp = current.find('.flipp');

        flipp.attr({
            'aria-controls': collapsible.attr('id'),
            'aria-owns': collapsible.attr('id'),
            'aria-expanded': 'false',
            'aria-haspopup': 'true'
        });
        collapsible.attr({
            'aria-hidden': 'true',
            'aria-expanded': 'false',
            'aria-labelledby': flipp.attr('id')
        });

    });


    //
    //  Velg skjema:
    //

     var truncateWrappers = $('.truncate-wrapper');

     truncateWrappers.each(function () {
         var current = $(this);
         current.find('.full-text, .show-truncated-text').attr({'aria-hidden': true})
         current.find('.toggle-truncation').attr({'aria-controls': current.attr('id')});
     });

     $('.toggle-truncation').on('click', function () {
         var parent = $(this).closest('.truncate-wrapper'),
             truncText = parent.find('.truncated-text'),
             fulltext = parent.find('.full-text'),
             showMore = parent.find('.show-full-text'),
             showLess = parent.find('.show-truncated-text');


         if (parent.hasClass('js-full-text')) {
             // klikk på "vis mindre". Skjul full-text
             parent.removeClass('js-full-text');
             fulltext.attr({'aria-hidden': true});
             truncText.attr({'aria-hidden': false});
             showMore.attr({'aria-hidden': false});
             showLess.attr({'aria-hidden': true});
             showMore.focus();

         }
         else {
             // klikk på "vis mer". Vis full tekst, skjul forkorta tekst
             parent.addClass('js-full-text');
             fulltext.attr({'aria-hidden': false});
             truncText.attr({'aria-hidden': true});
             showMore.attr({'aria-hidden': true});
             showLess.attr({'aria-hidden': false});
             showLess.focus();

         }
     });


    //
    // PDF warning
    //



     if ($('#warning-pdf-upload').length > 0) {

         var isTouch = !!Object.prototype.hasOwnProperty.call(window, "ontouchstart");
        // var isMobileDevice = (('ontouchstart' in document.documentElement) || (navigator.msMaxTouchPoints > 0));

         var isMacOS = window.navigator.platform.toUpperCase().indexOf('MAC') >= 0;
         var isIOS = window.navigator.platform.match(/(iPhone|iPod|iPad)/i) ? true : false;
         var isAndroidOS = window.navigator.userAgent.toUpperCase().indexOf('ANDROID') >= 0;
         var isGoogleChrome = window.navigator.vendor.toUpperCase().indexOf('GOOGLE') >= 0;

         if ((isGoogleChrome && !isTouch) || isMacOS || isIOS || isAndroidOS) {
             $(".innsending-info").attr("data-pdf-info-showing", true);
         }

         if (isGoogleChrome && !isTouch) {
             $(".user-message-panel[data-platform='chrome-pdf-info']").show();
         }
         else if (isMacOS) {
             $(".user-message-panel[data-platform='mac-pdf-info']").show();
         }
         else if (isIOS) {
             $(".user-message-panel[data-platform='ios-pdf-info']").show();
         }
         else if (isAndroidOS) {
             $(".user-message-panel[data-platform='android-pdf-info']").show();
         }
     }

     //
     // Validering av valgt emne (klage på vedtak) før submit (neste steg)
     //

     $('#form-complaint-firstpage').on('submit change', function(e) {

         var form = $(this);
         if (form.find('option:selected').prop('disabled')) {
             e.preventDefault();
             form.find('.error-panel').css('display', 'block');
         }

         else {
             form.find('.error-panel').css('display', 'none');
         }

     });


     //
     // Google analytics
     //

     if (typeof ga !== 'undefined' && ga.hasOwnProperty('loaded') && ga.loaded === true) {

         $('#generate-pdf, a.download-attachment').on('click.google-analytics', function () {
             ga('send', 'event', 'skjemaveileder', 'klikk', $(this).text());
         });

         $('#goto-sendsoknad').on('click.google-analytics', function () {
             ga('send', 'event', 'skjemaveileder', 'klikk', 'Go to sendsoknad');
         });

         $('#goto-dokumentinnsending').on('click.google-analytics', function () {
             ga('send', 'event', 'skjemaveileder', 'klikk', 'Go to dokumentinnsending');
         });

         $('.toggle-truncation.show-full-text').on('click.google-analytics', function () {
             ga('send', 'event', 'skjemaveileder', 'klikk', 'Vis hele teksten (velg skjema)');
         });

     }

});
