var navno = window.navno || {};

  $.fn.navnoAccordion = function() {
    var _addUniqueId,
        _togglePanel,
        uuid = 0;


          _addUniqueId = function (element) {

            element = $(element);
            if (!element.attr("id")) {
                element.attr("id", "accordion" + "-" + new Date().getTime() + "-" + (++uuid));
            }
        };

        _togglePanel = function (event) {

                 var target = $(event.target),
                     thisItem = target.closest('.accordion-item'),
                     height = thisItem.find('ul').height() + 30; // height + padding
                        
                     //console.log(height);   
                     
                  thisItem.siblings().removeClass('expanded js-animated') 
                    .find('.accordion-panel').css('height','').parent()
                    .find('[aria-expanded]')
                    .attr('aria-expanded', 'false')
                    .attr('aria-hidden', 'true');


                    if (!thisItem.hasClass('expanded')) { 
                      thisItem.addClass('expanded js-animated')
                              .find('.accordion-panel').css('height',height).parent()
                              .find('[aria-expanded]')
                              .attr('aria-expanded', 'true')                 
                              .attr('aria-hidden', 'false');

                    }
                    else {
                      thisItem.removeClass('expanded')
                          .find('.accordion-panel').css('height','').parent()
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
                        panel = item.find('.accordion-panel'),
                        panelToggler = item.find('.accordion-toggle');
       
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


            $('.accordion-toggle').on('click', function(event){ 
                 event.preventDefault();
                 _togglePanel(event);
            });
    });

  }; // plugin end

$(document).ready(function(){
$('#related-content-accordion').navnoAccordion();
$('.valgForSkjemasok').navnoAccordion();
});
