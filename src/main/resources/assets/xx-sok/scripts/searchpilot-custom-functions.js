var navet = window.navet || {};
navet.searchFieldPlaceholder = 'Skriv inn søkeord';

window.onload=resetTilknytningsForm;
window.onunload=resetTilknytningsForm;

$(function () { // document ready
    nedtrekkMiniInit();

    function setCheckedOnInputChildren(parent, checkedValue) {
        parent.find('input').each(function() {
            if($(this).attr('disabled') == undefined){
                $(this).attr('checked', checkedValue);
            }
        });
    }

    function createTilknytningAlleInputFelt(){
        return $('<input>').attr({
            type: 'hidden',
            name: 'tilknytningAlle'}
        );
    }

    if ($('#searchField').val() === '') {
        $('#searchField').val(navet.searchFieldPlaceholder);
        $('#searchField').addClass('placeholder');
    }
    $('#searchField').focus(function(){
        if ($(this).val() === navet.searchFieldPlaceholder) {
            $(this).val('');
            $(this).removeClass('placeholder');
        }
    }).blur(function(){
        if ($(this).val() === '') {
            $(this).val(navet.searchFieldPlaceholder);
            $(this).addClass('placeholder');
        }
    });
    $('#searchButton').click(function(event){
        if($('#searchField').val() === '' || $('#searchField').val() === navet.searchFieldPlaceholder){
            event.preventDefault();
            return false;
        } else {
            return true;
        }
    });

    $('#sortForm select').change(function() {
       this.form.submit();
    });

    $('#sentraleTittel').click(function(){
        if($('#sentraleValg').is(":visible")){
            $('#sentraleTittel').removeClass("vistListe").addClass("skjultListe");
            $('#sentraleValg').hide();
        } else {
            $('#sentraleTittel').removeClass("skjultListe").addClass("vistListe");
            $('#sentraleValg').show();
            $('#lokaleTittel').removeClass("vistListe").addClass("skjultListe");
            $('#lokaleValg').hide();
        }
    });

    $('#lokaleTittel').click(function(){
        if($('#lokaleValg').is(":visible")){
            $('#lokaleTittel').removeClass("vistListe").addClass("skjultListe");
            $('#lokaleValg').hide();
        } else {
            $('#lokaleTittel').removeClass("skjultListe").addClass("vistListe");
            $('#lokaleValg').show();
            $('#sentraleTittel').removeClass("vistListe").addClass("skjultListe");
            $('#sentraleValg').hide();
        }
    });

    $('#velgAlleSentrale').live('click', function(){
        setCheckedOnInputChildren($('#lokale'), false);
        setCheckedOnInputChildren($('#sentrale'), true);

        var tilknytningAlleInputFelt = createTilknytningAlleInputFelt();
        tilknytningAlleInputFelt.attr('value', 'sentrale');
        tilknytningAlleInputFelt.appendTo('#tilknytningsForm');

        $('#tilknytningsForm').submit();
        return false;
    });

    $('#velgAlleSentraleCheckbox').live('click', function(){
        if($('input[name=tilknytningAlle]').val() == null || !$('input[name=tilknytningAlle]').val() == 'sentrale'){
            setCheckedOnInputChildren($('#lokale'), false);
            setCheckedOnInputChildren($('#sentrale'), true);

            var tilknytningAlleInputFelt = createTilknytningAlleInputFelt();
            tilknytningAlleInputFelt.attr('value', 'sentrale');
            tilknytningAlleInputFelt.appendTo('#tilknytningsForm');

        } else {
            setCheckedOnInputChildren($('#sentrale'), false);
            $('input[name=tilknytningAlle]').remove();
        }
    });

    $('#velgAlleLokale').live('click', function(){
        setCheckedOnInputChildren($('#lokale'), true);
        setCheckedOnInputChildren($('#sentrale'), false);

        var tilknytningAlleInputFelt = createTilknytningAlleInputFelt();
        tilknytningAlleInputFelt.attr('value', 'lokale');
        tilknytningAlleInputFelt.appendTo('#tilknytningsForm');

        $('#tilknytningsForm').submit();
        return false;
    });

    $('#velgAlleLokaleCheckbox').live('click', function(){
        if($('input[name=tilknytningAlle]').val() == null || !$('input[name=tilknytningAlle]').val() == 'lokale'){
            setCheckedOnInputChildren($('#lokale'), true);
            setCheckedOnInputChildren($('#sentrale'), false);

            var tilknytningAlleInputFelt = createTilknytningAlleInputFelt();
            tilknytningAlleInputFelt.attr('value', 'lokale');
            tilknytningAlleInputFelt.appendTo('#tilknytningsForm');

        } else {
            setCheckedOnInputChildren($('#lokale'), false);
            $('input[name=tilknytningAlle]').remove();
        }
    });

    $('#sentrale input[name=tilknytning]').live('click', function(){
        $('input[name=tilknytningAlle]').remove();
    });

    $('#lokale input[name=tilknytning]').live('click', function(){
        $('input[name=tilknytningAlle]').remove();
    });


    
});// document ready end

function resetTilknytningsForm() {
    document.getElementById('tilknytningsForm').reset();
}

function nedtrekkMiniInit() { //Nedtrekk Mini

    $('.nedtrekk_mini_placeholder').each(function() {
        var width = $(this).siblings('.nedtrekk_mini').width();
        var height = $(this).siblings('.nedtrekk_mini').height();
        $(this).css({ width: width, height: height });
    });

    $('.nedtrekk_mini').listbox();

    $('.trekkspillcollapseable').parent().find('DIV.dark').hide();

    $('.trekkspillcollapseable').toggle(function() {
        $(this).parent().not('.empty').find('DIV.dark').slideDown(500);
        $(this).removeClass("kollapset");
        $(this).addClass("ekspandert");
    }, function() {
        $(this).parent().not('.empty').find('DIV.dark').slideUp();
        $(this).removeClass("ekspandert");
        $(this).addClass("kollapset");
    });
}

(function ($) {
    var listbox_selector;
    var focused_option;
    $.fn.listbox = function () {
        listbox_selector = $(this);
        listbox_selector.each(function () {
            if ($(this).children("A.selected").length == 0) {
                $(this).parent().hide()
            }
        });
        listbox_selector.children("A").focus(function (e) {
            if (!$(this).parent().hasClass("active_listbox")) {
                hideListbox($(".active_listbox"));
                showListbox($(this));
                $(this).click(function () {
                    return false
                })
            }
        });
        $("body").click(function () {
            hideListbox(null)
        });
        listbox_selector.click(function (e) {
            e.stopPropagation()
        });
        listbox_selector.children("A").keydown(function (e) {
            var keyCode = e.keyCode || e.which;
            var index = $(this).index();
            var parent = $(this).parent();
            if (e.shiftKey && keyCode === 9) {
                focused_option = $(this).prev();
                if (index > 0) {
                    parent.attr("aria-activedescendant", $(focused_option).attr("id"))
                } else {
                    hideListbox(parent)
                }
            } else {
                if (keyCode === 9) {
                    focused_option = $(this).next();
                    if (index < parent.children().length - 1) {
                        parent.attr("aria-activedescendant", $(focused_option).attr("id"))
                    } else {
                        hideListbox(parent)
                    }
                } else {
                    if (keyCode === 13) {
                        focused_option.siblings().removeClass("selected");
                        focused_option.addClass("selected");
                        parent.attr("aria-activedescendant", $(focused_option).attr("id"));
                        hideListbox(parent)
                    } else {
                        if (keyCode === 27) {
                            hideListbox(null)
                        }
                    }
                }
            }
        });
        return this
    };
    var showListbox = function (active_option) {
            var active_listbox = active_option.parent();
            var selected_option = active_listbox.children(".selected");
            active_listbox.addClass("active_listbox");
            topAndScroll(active_option);
            selected_option.siblings().css({
                display: "block"
            })
        };
    var hideListbox = function (active_listbox) {
            if (active_listbox == null) {
                active_listbox = listbox_selector;
                $(".nedtrekk_mini").removeClass("active_listbox").removeAttr("style").children(":not(.selected)").hide()
            } else {
                active_listbox.removeClass("active_listbox").removeAttr("style").children(":not(.selected)").hide()
            }
        };
    var topAndScroll = function (active_option) {
            var active_listbox = active_option.parent();
            var active_option_offset = active_option.offset();
            var active_option_height = active_option.outerHeight();
            var active_listbox_height = (active_option_height * active_listbox.children().length) + 14;
            var full_height = active_listbox_height;
            if (active_listbox_height > 400) {
                active_listbox_height = 400
            }
            var height_above_selected = active_option_height * active_option.index();
            var scrolltop = 0;
            if (full_height > active_listbox_height) {
                scrolltop = height_above_selected - active_option_offset.top + active_option_height - 13
            }
            var top = active_option_offset.top - height_above_selected - 14;
            if (top < 2) {
                top = 2
            }
            active_listbox.animate({
                scrollTop: scrolltop
            }, 3);
            /*if (active_listbox.parent().css("float") == "right") {
                active_listbox.offset({
                    top: top,
                    right: 0
                })
            } else {
                active_listbox.offset({
                    top: top,
                    left: active_option_offset.left - 13
                })
            }*/
        }
})(jQuery);