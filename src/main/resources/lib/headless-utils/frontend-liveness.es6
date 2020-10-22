const proxyFlag = 'newFrontend';
const livenessCheckPeriod = 10000;
let newFrontendLivenessCheckRetryTime = 0;

const isLive = (req) => {
    // Checks if request to the new frontend looped back
    if (req.params[proxyFlag]) {
        newFrontendLivenessCheckRetryTime = Date.now() + livenessCheckPeriod;
        delete req.params[proxyFlag];
    }

    return Date.now() > newFrontendLivenessCheckRetryTime;
};

module.exports = { isLive, proxyFlag };
