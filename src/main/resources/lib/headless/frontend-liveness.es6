const loopbackFlag = 'loopback';
const livenessCheckPeriod = 10000;
let livenessCheckTimestamp = 0;

const setFrontendNotLive = (logentry) => {
    log.info(logentry);
    livenessCheckTimestamp = Date.now();
};

// Worst problem of 2020: finding good names for anything related to this function
const shouldTryNewFrontend = (req) => {
    // Checks if request to the new frontend looped back
    if (req.params[loopbackFlag]) {
        setFrontendNotLive(`Frontend call looped back from ${req.url}`);
        delete req.params[loopbackFlag];
    }

    return Date.now() > livenessCheckTimestamp + livenessCheckPeriod;
};

module.exports = { shouldTryNewFrontend, loopbackFlag, setFrontendNotLive };
