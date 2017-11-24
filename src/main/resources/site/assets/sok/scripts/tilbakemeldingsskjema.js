
$(document).ready(function() {
    $("input[name='score']").click(function() {
        $('.feilmelding').hide();
    });
    $("input[name='score']").removeAttr('checked');
    $("#melding").val('');

    $("#tilbakemelding").validate({
        submitHandler: function (form) {
            var query = $('input[name="query"]').val();
            var score = $('input[name="score"]:checked').val();
            if(score !== undefined){
                var subject = $('input[name="subject"]');
                $(subject).attr('value', query + " score=" + score);

                $('#tilbakemelding').hide();
                $('<h2 class="takk">Takk for din tilbakemelding!</h2>').insertAfter('#tilbakemelding');

                $.ajax({
                    type: 'POST',
                    data: $(form).serialize(),
                    error: function(xml, text, error) {
                    },
                    success: function(html) {
                    },
                    url: tilbakemeldingFormUrl
                });
            } else {
                $('.feilmelding').show();
            }
            return false;
        }
    });
});
