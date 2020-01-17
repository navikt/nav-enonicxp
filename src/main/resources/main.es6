log.info('Started running main');
const cache = require('/lib/cacheControll');
const unpublish = require('/lib/cacheControll/unpublishTask');
const officeInformation = require('/lib/officeInformation');
const taskLib = require('/lib/xp/task');
const eventLib = require('/lib/xp/event');
let isRunning = true;
let taskIds = [];

// start pull from NORG
officeInformation.startCronJob();
// start cache invalidator
cache.activateEventListener();

// start task for handling caching of expired and prepublished content
let currentTaskId = unpublish.start(isRunning);
taskIds.push(currentTaskId);

// keep the process of handling expired content in the cache alive.
eventLib.listener({
    type: 'task.finished',
    localOnly: false,
    callback: (event) => {
        if (event.data.description === unpublish.taskDescription) {
            // if the task which have finished is not in current state, ignore it.
            if (taskIds.indexOf(event.data.id) === -1) {
                return;
            }
            // update state and spawn of a new task
            taskIds = taskIds.filter(task => task !== event.data.id);
            currentTaskId = unpublish.setupTask(isRunning);
            taskIds.push(currentTaskId);
        }
    }
});
log.info('Finished running main');

__.disposer(function() {
    // when the app is closed down, tasks might have survived and should not
    // spawn of new tasks. We keep this state to make sure of this.
    isRunning = false;
});
