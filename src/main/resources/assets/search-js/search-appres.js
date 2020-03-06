(function() {
    function init() {
        $('#searchbar').submit(submitForm);
        $('#fasettform').submit(submitForm);
        $('#sort input[name="s"]').on('change', changeSort);
        $('.svart').on('change', changeDate);
        $('input[name=f]').on('change', changeFasett);
        $('.wic').on('change', changeUnderfasett);
        $('input.defaultFasett').on('change', changeDefaultFasett);
        $('div.minimertFiltreringspanel>ul.fasettListe>li').click(changeFasettMobile);

        var $flere = $('#flere');
        if ($flere) {
            $flere.on('click', getMore);
        }
    }
    init();
    function setC(n) {
        // count
        $('input[name=c]').val(n);
    }
    function update(e) {
        e.preventDefault();

        var $th = $('#fasettform');
        window.history.pushState(
            null,
            document.title,
            window.location.origin + window.location.pathname + '?' + $th.serialize()
        );

        var count = Number($('input[name=c]').val());
        var $resultList = $('.sokeresultatliste');
        $.ajax({
            type: $th.attr('method'),
            url: $th.attr('action'),
            data: $th.serialize() + '&start=' + (count - 1),
            success: function(data) {
                // update heading
                $('#search-result-heading').text(data.fasett);
                // append all hits to result list
                for (var i = 0; i < data.hits.length; i += 1) {
                    var hit = data.hits[i];
                    var hitTemplate =
                        '<li class="' +
                        hit.className +
                        '">' +
                        '<a href="' +
                        hit.href +
                        '">' +
                        '<h2>' +
                        hit.displayName +
                        '</h2><p>' +
                        hit.displayPath +
                        '</p>';
                    if (!hit.officeInformation) {
                        // normal
                        hitTemplate += '<p class="resultattekst">' + hit.highlight + '</p>';
                        if (hit.publishedString) {
                            hitTemplate +=
                                '<p class="published-time">' +
                                '<span>' +
                                hit.publishedString +
                                '</span>' +
                                '</p>';
                        }
                    } else {
                        // officeInformation/enhetsinformasjon
                        hitTemplate += '<table>' + '<tbody>' + '<tr>';
                        hitTemplate +=
                            '<td>' +
                            'TELEFON:' +
                            '</td>' +
                            '<td>' +
                            hit.officeInformation.phone +
                            '</td>';
                        hitTemplate +=
                            '</tr>' +
                            '<tr>' +
                            '<td>' +
                            'PUBLIKUMSMOTTAK:' +
                            '</td>' +
                            '<td>' +
                            '<ul>';
                        for (
                            var j = 0;
                            j < hit.officeInformation.audienceReceptions.length;
                            j += 1
                        ) {
                            hitTemplate +=
                                '<li class="listeinnisoketreff">' +
                                '<span>' +
                                hit.officeInformation.audienceReceptions[j] +
                                '</span>' +
                                '</li>';
                        }
                        hitTemplate += '</ul>' + '</td>' + '</tr>' + '</tbody>' + '</table>';
                    }
                    if (hit.priority) {
                        hitTemplate +=
                            '<p data-th-if="$' + hit.priority + '">Innhold anbefalt av NAV</p>';
                    }
                    hitTemplate += '</a>' + '</li>';
                    $resultList.append($(hitTemplate));
                }

                // update hit count
                $('#hit-count').text(data.total);

                // update date periods
                var totalInDateCount = 0;
                var timeIntervals = data.aggregations.Tidsperiode.buckets.map(function(elem, ix) {
                    elem.index = ix;
                    return elem;
                });

                var order = [
                    'Siste 7 dager',
                    'Siste 30 dager',
                    'Siste 12 måneder',
                    'Eldre enn 12 måneder',
                ];
                timeIntervals = timeIntervals.sort(function(a, b) {
                    if (order.indexOf(a.key) > order.indexOf(b.key)) {
                        return 1;
                    }
                    if (order.indexOf(b.key) > order.indexOf(a.key)) {
                        return -1;
                    }
                    return 0;
                });

                console.log(timeIntervals);
                for (var k = 0; k < timeIntervals.length; k += 1) {
                    var datePeriod = timeIntervals[k];
                    totalInDateCount += datePeriod.docCount;
                    $('input[name="daterange"][value="' + datePeriod.index + '"]')
                        .parent()
                        .find('span')
                        .text(datePeriod.docCount);
                }
                $('input[name="daterange"][value="-1"]')
                    .parent()
                    .find('span')
                    .text(totalInDateCount);

                // show/hide load more button
                if (data.isMore) {
                    $('#flere').removeClass('hidden');
                } else {
                    $('#flere').addClass('hidden');
                }
            },
            error: function(error) {
                console.log(error);
            },
        });
    }
    function submitForm() {
        $(this.form).submit();
    }
    function getMore(e) {
        var $c = $('input[name=c]');
        var v = Number($c.val());
        setC(v + 1);
        update(e);
    }
    function changeFasett(e) {
        setC(1);
        $('.sokeresultatliste').empty();
        $('.utvidbar.erValgt').removeClass('erValgt');
        $('ul.fasettListe>li.erValgt').removeClass('erValgt');
        var $parent = $(this).parent();
        $parent.addClass('erValgt');
        $parent.find('div input.defaultFasett').prop('checked', true);
        $('ul.fasettListe>li[data-facet="' + $(this).val() + '"]').addClass('erValgt');
        $('.wic').prop('checked', false);
        update(e);
    }
    function changeFasettMobile(e) {
        var $facet = $('input[name="f"][value="' + $(this).data('facet') + '"]').eq(0);
        if (!$facet.is(':checked')) {
            $facet.prop('checked', true);
            $facet.trigger('change');
        }
    }
    function changeDefaultFasett(e) {
        setC(1);
        $('.sokeresultatliste').empty();
        $('.wic').prop('checked', false);
        update(e);
    }
    function changeUnderfasett(e) {
        setC(1);
        $('.sokeresultatliste').empty();
        if ($('.utvidbar.erValgt div input:checked').length === 0) {
            $('.utvidbar.erValgt')
                .find('input.defaultFasett')
                .prop('checked', true);
        } else {
            $('.utvidbar.erValgt')
                .find('input.defaultFasett')
                .prop('checked', false);
        }
        update(e);
    }
    function changeDate(e) {
        setC(1);
        $('.sokeresultatliste').empty();
        update(e);
    }
    function changeSort(e) {
        setC(1);
        $('.sokeresultatliste').empty();
        $('#fasettform [name="s"]').val($(this).val());
        update(e);
    }
})();
