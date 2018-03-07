const serviceUrl = document.currentScript.getAttribute('data-serviceurl');

var deleteTaskId, listTaskId;
$(function () {
    $('#deleteContent').on('click', executeDeleteContent);
    $('#moveContent').on('click', executeMoveContent);
    $('#listNotinuse').on('click', executeListNotinuse);
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

function executeMoveContent(e) {
    e.preventDefault();
    $('#moveContent,#moveContentResult').hide();
    $('#moveContentExecuting').show();

    $.ajax({
        type: "POST",
        url: serviceUrl,
        dataType: 'json',
        data: {
            action: 'moveContent'
        },
        success: function (data) {
            moveTaskId = data.id;
            checkStatus(moveTaskId, moveContentDone);
        },
        error: function () {
            console.log(arguments);
            $('#moveContent').show();
            $('#moveContentExecuting').hide();
        }
    });
}

function moveContentDone(result) {
    $('#moveContent').show();
    $('#moveContentExecuting').hide();
    $('#moveContentResult').show().text(result);
}

function executeListNotinuse(e) {
	$('#listNotinuse,#listNotinuseResult').hide();
	$('#listNotinuseExecuting').show();

	$.ajax({
		type: "POST",
		url: serviceUrl,
		dataType: 'json',
		data: {
			action: 'listNotinuse'
		},
		success: function(data) {
			listTaskId = data.id;
			checkStatus(listTaskId, listNotinuseDone);
		},
		error: function() {
			//console.log(arguments);
			$('#listNotinuse').show();
			$('#listNotinuseExecuting').hide();
		}
	});
}

function listNotinuseDone(result) {
    $('#listNotinuse').show();
    $('#listNotinuseExecuting').hide();
    $('#listNotinuseResult').show().text(result);
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
