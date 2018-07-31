$(function() {
    $('#write-to-us').on('submit', function(e) {
        e.preventDefault();
        var errorMsg = $('#write-to-us-error');

        errorMsg.addClass('hidden');

        var checked = $('input:checked', this);

        if(checked.length) {
            var url = checked.data('url');
            window.location = url;
        }

        else {
            errorMsg.removeClass('hidden').focus();
            return false;
        }
    });
});
