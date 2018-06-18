(function(eWs) {
    var ws = new eWs();
    var io = new ws.Io();

    io.on('hello', function (message) {
        console.log(message);
    });


})(window.ExpWS);