var prompt = require('prompt');
var fs = require('fs');

prompt.start();

prompt.colors = false;

prompt.message = '>>';

var schema = {
    properties: {
        key: {
            description: 'Nøkkel'
        },
        'phrases_no.properties': {
            description: 'Norsk'
        },
        'phrases_en.properties': {
            description: 'English'
        },
        'phrases_se.properties': {
            description: 'Sami'
        }
    }
}
function again() {
    prompt.get(schema, function (err, result) {
        var key = result.key;
        result['phrases.properties'] = result['phrases_no.properties'] || result['phrases_en.properties'];
        var dir = __dirname + '/src/main/resources/site/i18n/';
        for (const k in result) {
            if (result.hasOwnProperty(k) && k !== 'key' && result[k]) {
                fs.readFile(dir+k, 'utf-8', function (err, data) {
                    if (!err) {
                        var s = data + '\n' + key +'=' +result[k];
                        fs.writeFile(dir+k, s, 'utf-8', function (err) {
                            if (err) console.log(err);
                        });
                    }
                })
            }
        }
        prompt.get(['Another'], function (err, res) {
            if (!res.Another || res.Another.toLowerCase().indexOf('n') === -1) again();
        })
    });

}

again();
