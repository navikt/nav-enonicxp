(function() {
    function init() {
        $('#searchbar').submit(submitForm);
        $('#fasettform').submit(submitForm);
        $('#sort').submit(submitForm);
        $('input[name=s]').on('change', submitForm);
        $('.svart').on('change', submitForm4);
        $('input[name=f]').on('change', submitForm2);
        $('.wic').on('change', submitForm4);
        $('input.defaultFasett').on('change', submitForm2);

        var flere = $('#flere');
        if (flere) {
            flere.on('click', submitForm3);
        }
    }
    init();
    function clearAllListeners() {
        $('#searchbar').off('submit', submitForm);
        $('#fasettform').off('submit', submitForm);
        $('#sort').off('submit', submitForm);
        $('input[name=s]').off('change', submitForm);
        $('.svart').off('change', submitForm4);
        $('input[name=f]').off('change', submitForm2);
        $('.wic').off('change', submitForm4);
        $('input.defaultFasett').off('change', submitForm2);
    }
    function setC(n) {
        $('input[name=c]').val(n);
    }
    function update(e) {
        var th = $(this);
        e.preventDefault();
        $.ajax({
            type: th.attr('method'),
            url: th.attr('action'),
            data: th.serialize(),
            success: function(data) {
                window.history.pushState(null, window.title, location.origin + location.pathname + '?' + th.serialize());
                $('#sres').html(data);
                clearAllListeners();
                init();
            },
            error: function(error) {
                console.log(error);
            }
        });
    }
    function submitForm() {
        $(this.form).submit();
    }
    function submitForm2() {
        setC(1);
        $('.wic').prop('checked', false);
        $(this.form).submit();
    }
    function submitForm3() {
        var i = $('input[name=c]');
        var v = Number(i.val());
        i.val(v + 1);
        $('#fasettform').submit();
    }
    function submitForm4() {
        setC(1);
        $(this.form).submit();
    }
})();
