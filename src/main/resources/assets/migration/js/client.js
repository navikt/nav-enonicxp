(function(eWs) {
    var ws = new eWs();
    var io;

    var colums;
    var error;
    var errorHead;
    var errorBody;
    var status;
    var statusBody;

    $(function() {
        colums = $('#columns');
        error = $('#error');
        errorBody = $('#error-body');
        errorHead = $('#error-header');
        status = $('#status');
        statusBody = $('#status-body');
        status.hide();
        error.hide();
        io = new ws.Io();
        init();
    });

    function init() {
        ws.setEventHandler('close', function (event) {
            if (!event.wasClean) {
                errorBody.text('Your websocket connection with the server has closed Reason: '+ event.reason);
                errorHead.text('Connection lost!');
                error.show();

            }
        });
        io.on('newTask', function (message) {
            if (message.isNew) return newCreateElements(message);
            colums.append(createNewElements(message.elements));
            addAction(message.action);
            addProgress(message.progress);
        });
        io.on('error', function(message) {
            errorBody.text(message.body);
            errorHead.text(message.title);
            error.show();
        })
    }

    function newCreateElements(elements) {
        var newElement = $('<div class="column"></div>');
        var newCard = $('<div class="card"></div>');

        var head = $('<header class="card-header"><p class="card-header-title">'+ elements.head +'</p></header>');
        newCard.append(head);

        var body = $('<div class="card-content"></div>');
        if (elements.preBody) {
            body = $('<div class="row"></div>');
        }
        elements.body.elements.forEach(function handleElements(element) {
            var newTag = $('<' + element.tag + '></'+element.tag+'>');
            if (element.tagClass) {
                element.tagClass = (Array.isArray(element.tagClass)) ? element.tagClass : [element.tagClass];
                element.tagClass.forEach(function (value) {
                    newTag.addClass(value);
                });
            }
            if (element.id) newTag.attr('id', element.id);
            if (element.update) {
                io.on(element.update, function (message) {
                    var update = $('<p></p>');
                    update.text(message);
                    newTag.append(update);
                })
            }
            if (element.status) {
                status.show();
                var st = $('<p></p>');
                io.on(element.status, function(message) {
                    st.text(message);
                });
                statusBody.append(st);
            }
            if (element.progress) {
                var pval = $('<span></span>');
                pval.attr('id', element.id + 'value');
                newTag.attr('value', 0);
                newTag.attr('max', 100);
                io.on(element.progress.value, function (val) {
                    newTag.attr('value', val);
                    pval.text(' ' + newTag.attr('value') + '/' + newTag.attr('max'));
                });
                io.on(element.progress.max, function (val) {
                    if (val === 0) {
                        newTag.attr('value', 1);
                        newTag.attr('max', 1);
                        pval.text(' '+'0/0');
                    }
                    else {
                        newTag.attr('max', val);
                        pval.text(' ' +newTag.attr('value') + '/' + newTag.attr('max'));
                    }

                });
                this.append(pval);
            }
            if (element.action) {
                newTag.click(function () {
                    io.emit(element.action, 'hello');
                })
            }
            if (element.text) newTag.text(element.text);
            if(element.elements) element.elements.forEach(handleElements,newTag);
            this.append(newTag)

        },body);

        if (!elements.preBody) {
            newCard.append(body);

            newElement.append(newCard);
            colums.append(newElement);
        }
        else {
            colums.after(body);
        }

    }


    function createNewElements(newElement) {
        var element = $(newElement.tag);
        newElement.elements.forEach(function (el) {
            element.append(createNewElements(el));
        });
        return element;
    }

    function addAction(actions)  {
        if (actions) {
            actions.forEach(function (action) {
                $('#' + action.id).click(function (e) {
                    io.emit(action.emit, action.action);
                })
            })

        }
    }

    function addProgress(progres) {
        if (progres) {
            progres.forEach(function (progress) {
                var progressEl = $('#' + progress.id);
                var progVal = $('#' + progress.valId);
                io.on(progress.value, function (value) {
                    progressEl.attr('value', value);
                    progVal.text(progressEl.attr('value') + '/' + progressEl.attr('max'));
                });
                io.on(progress.max, function (max) {
                    progressEl.attr('max', max);
                    progVal.text(progressEl.attr('value') + '/' + progressEl.attr('max'));
                })
            })

        }
    }


})(window.ExpWS);