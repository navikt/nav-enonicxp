$(document).ready(function() {
    modifyMNDOptions();
    $("#aar").change(modifyMNDOptions);
});

var modifyMNDOptions = function() {
    var selectedAarOption = $.trim($("#aar option:selected").text());
    $("#mnd option").each(function(i) {
        if(this.text != "Alle (Hele året)"){
            if(this.value.indexOf(selectedAarOption) == -1)
            {
                if(!$(this).hasClass("hiddenOption"))
                {
                    $(this).addClass("hiddenOption");
                }
            } else
            {
                if($(this).hasClass("hiddenOption"))
                {
                    $(this).removeClass("hiddenOption");
                }
            }
        }
    });
    if($("#mnd option:selected").hasClass("hiddenOption")){
        $("#mnd option:first").attr('selected', 'selected');
    }
};