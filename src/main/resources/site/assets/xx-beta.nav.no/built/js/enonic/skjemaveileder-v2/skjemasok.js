/*
*
*
*   KOPI av nav-accordion.js
*
*
*
* */
var navno = window.navno || {};

  $.fn.navnoAccordion = function() {
    var _addUniqueId,
        _togglePanel,
        uuid = 0;


          _addUniqueId = function (element) {

            element = $(element);
            if (!element.attr("id")) {
                element.attr("id", "utvidbart-innhold" + "-" + new Date().getTime() + "-" + (++uuid));
            }
        };

        _togglePanel = function (event) {

                 var target = $(event.target),
                     thisItem = target.closest('.valgForSkjemasok'),
                     height = thisItem.find('ul').height() + 20; // height + padding
                        
                    if (!thisItem.hasClass('expanded')) { 
                      thisItem.addClass('expanded js-animated')
                              .find('.utvidbart-panel').css('height',height).parent()
                              .find('[aria-expanded]')
                              .attr('aria-expanded', 'true')                 
                              .attr('aria-hidden', 'false');
                    } else {
                      thisItem.removeClass('expanded')
                          .find('.utvidbart-panel').css('height','').parent()
                          .find('[aria-expanded]')
                          .attr('aria-expanded', 'false')
                          .attr('aria-hidden', 'true');
                           setTimeout(function(){
                              thisItem.removeClass('js-animated'); // wait for animation to run
                            }, 200);
                    }
        };


      return this.each(function () {
            var accordion = $(this),
                accordionItems = accordion.children();

                accordionItems.each(function (i, accordionItem) {                 
                   var  item = $(accordionItem),
                        panel = item.find('.utvidbart-panel'),
                        panelToggler = item.find('.toggle-element');

                        _addUniqueId(panel);   
                        _addUniqueId(panelToggler); 

                        panelToggler.attr({
                            "aria-haspopup": true,
                            "aria-owns": panel.attr("id"),
                            "aria-controls": panel.attr("id"),
                            "aria-expanded": false
                        });

                        panel.attr({
                            "role": "group",
                            "aria-expanded": false,
                            "aria-hidden": true
                        })
                          .not("[aria-labelledby]")
                          .attr("aria-labelledby", panelToggler.attr("id"));
                });

            $('.toggle-element').on('click', function(event){ 
                event.preventDefault();
                _togglePanel(event);
            });
    });
  }; // plugin end

$(document).ready(function(){
$('#utvidbart-innhold').navnoAccordion();
$('.valgForSkjemasok').navnoAccordion();
});