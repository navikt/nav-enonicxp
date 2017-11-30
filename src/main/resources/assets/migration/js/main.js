const serviceUrl = document.currentScript.getAttribute('data-serviceurl');

var deleteTaskId;
$(function () {
    $('#deleteContent').on('click', executeDeleteContent);
});

function executeDeleteContent(e) {
    e.preventDefault();
    $('#deleteContent,#deleteContentResult').hide();
    $('#deleteContentExecuting').show();

    $.ajax({
        type: "POST",
        url: serviceUrl,
        dataType: 'json',
        data: {
            action: 'deleteContent'
        },
        success: function (data) {
            deleteTaskId = data.id;
            checkStatus(deleteTaskId, deleteContentDone);
        },
        error: function () {
            console.log(arguments);
            $('#deleteContent').show();
            $('#deleteContentExecuting').hide();
        }
    });
}

function deleteContentDone(result) {
    $('#deleteContent').show();
    $('#deleteContentExecuting').hide();
    $('#deleteContentResult').show().text(result);
}

function checkStatus(id, onDone) {
    window.setTimeout(function () {
        doCheckStatus(id, onDone);
    }, 2000);
}

function doCheckStatus(id, onDone) {
    $.ajax({
        type: "GET",
        url: serviceUrl + '/status',
        dataType: 'json',
        data: {
            id: id
        },
        success: function (data) {
            if (data.done) {
                onDone(data.result);
            } else {
                checkStatus(id, onDone);
            }
        },
        error: function () {
            checkStatus(id, onDone);
        }
    });
}
