(function($) {

    var listbox_selector;
    var focused_option;

    $.fn.listbox = function() {

        listbox_selector = $(this);

        listbox_selector.children('A').focus(function(e) {
            if (! $(this).parent().hasClass('active_listbox')) {
                hideListbox($('.active_listbox'));
                showListbox(this);
                $(this).click(function() {
                    return false;
                });
            }
        });

        $('body').click(function() {
            hideListbox(null);
        });
        listbox_selector.click(function(e) {
            e.stopPropagation();
        });

        listbox_selector.children('A').keydown(function(e) {

            var keyCode = e.keyCode || e.which;

            var index = $(this).index();
            var parent = $(this).parent();

            if (e.shiftKey && keyCode === 9) {
                focused_option = $(this).prev();
                if (index > 0) {
                    parent.attr('aria-activedescendant', $(focused_option).attr('id'));
                } else {
                    hideListbox(parent);
                }

            } else if (keyCode === 9) {
                focused_option = $(this).next();
                if (index < parent.children().length - 1) {
                    parent.attr('aria-activedescendant', $(focused_option).attr('id'));
                } else {
                    hideListbox(parent);
                }

            } else if (keyCode === 13) {
                focused_option.siblings().removeClass('selected');
                focused_option.addClass('selected');
                parent.attr('aria-activedescendant', $(focused_option).attr('id'));
                hideListbox(parent);

            } else if (keyCode === 27) {
                hideListbox(null);

            }
        });

        return this;
    };

    var showListbox = function(active_option) {
        var active_listbox = $(active_option).parent();
        var selected_option = active_listbox.children('.selected');
        var width = selected_option.outerWidth(true);
        active_listbox.addClass('active_listbox');
        topAndScroll(active_option);
        selected_option.siblings().css({ display: 'block' });
    };

    var hideListbox = function(active_listbox) {
        if (active_listbox == null) active_listbox = listbox_selector;
        var selected_option = $(active_listbox).children('.selected');
        listbox_selector.removeAttr('style').removeClass('active_listbox');
        listbox_selector.children(':not(.selected)').removeAttr('style');
    };

    var topAndScroll = function(active_option) {
        var active_listbox = $(active_option).parent();
        var selected_option = active_listbox.children('.selected');
        var pos = selected_option.offset();
        var height = selected_option.outerHeight(true);
        var top = pos.top - (height * selected_option.index());
        var oldtop = top;
        if (pos.top + top < 0) top = 0;
        var totop = $(active_option).outerHeight(true) * ($(active_option).index() + 1);
        if (pos.top + oldtop < 0) {
            active_listbox.animate({ scrollTop: -Math.floor(oldtop) }, 3);
        } else if (totop > 530) {
            active_listbox.animate({ scrollTop: totop - 530 }, 3);
        }
        active_listbox.offset({ top: top, left: pos.left });
    };

})(jQuery);

