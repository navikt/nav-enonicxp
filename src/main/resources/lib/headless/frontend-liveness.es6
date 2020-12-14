const loopbackFlag = 'loopback';
const livenessCheckPeriod = 10000;
let livenessCheckTimestamp = 0;

const setFrontendNotLive = () => {
    livenessCheckTimestamp = Date.now();
};

const isFrontendLive = (req) => {
    // Checks if request to the new frontend looped back
    if (req.params[loopbackFlag]) {
        setFrontendNotLive();
        delete req.params[loopbackFlag];
    }

    return Date.now() > livenessCheckTimestamp + livenessCheckPeriod;
};

module.exports = { isFrontendLive, loopbackFlag, setFrontendNotLive };
