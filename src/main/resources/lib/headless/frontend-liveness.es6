const proxyFlag = 'fromProxy';
const livenessCheckPeriod = 10000;
let livenessCheckRetryTime = 0;

const isLive = (req) => {
    // Checks if request to the new frontend looped back
    if (req.params[proxyFlag]) {
        livenessCheckRetryTime = Date.now() + livenessCheckPeriod;
        delete req.params[proxyFlag];
    }

    return Date.now() > livenessCheckRetryTime;
};

module.exports = { isLive, proxyFlag };
