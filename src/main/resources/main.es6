log.info('Started running main');
const cache = require('/lib/siteCache');
const unpublish = require('/lib/siteCache/invalidator');
const officeInformation = require('/lib/officeInformation');
const eventLib = require('/lib/xp/event');

let appIsRunning = true;
let taskIds = [];

// start pull from NORG
officeInformation.startCronJob();
// start cache invalidator
cache.activateEventListener();

// start task for handling caching of expired and prepublished content
let currentTaskId = unpublish.start(appIsRunning);
taskIds.push(currentTaskId);

// keep the process of handling expired content in the cache alive.
eventLib.listener({
    type: 'task.*',
    localOnly: true,
    callback: event => {
        // need to listen to all task events and filter on finished and failed for resurrection
        if (!['task.finished', 'task.failed'].filter(eventType => event.type === eventType)) {
            return false;
        }
        if (event.data.description === unpublish.taskDescription) {
            // if the task which have finished is not in current state, ignore it.
            if (taskIds.indexOf(event.data.id) === -1) {
                return false;
            }
            // update state and spawn of a new task
            taskIds = taskIds.filter(task => task !== event.data.id);
            currentTaskId = unpublish.setupTask(appIsRunning);
            taskIds.push(currentTaskId);
        }
        return true;
    },
});
log.info('Finished running main');

__.disposer(function() {
    // when the app is closed down, tasks might have survived and should not
    // spawn of new tasks. We keep this state to make sure of this.
    appIsRunning = false;
});
