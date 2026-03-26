const cron = require("node-cron");
const { purgeSoftDeletedTasksOlderThanDays } = require("../models/tasksModel");

let cleanupTask = null;

function startTaskCleanupJob() {
    if (cleanupTask) {
        return cleanupTask;
    }

    cleanupTask = cron.schedule("0 0 * * *", async () => {
        try {
            const deletedCount = await purgeSoftDeletedTasksOlderThanDays(30);
            console.log(
                `[Cron] Soft-deleted task cleanup completed. Removed ${deletedCount} task(s) older than 30 days.`
            );
        } catch (error) {
            console.error("[Cron] Soft-deleted task cleanup failed.");
            console.error(error.stack || error.message);
        }
    });

    console.log("[Cron] Soft-deleted task cleanup job scheduled for daily midnight runs.");

    return cleanupTask;
}

function stopTaskCleanupJob() {
    if (!cleanupTask) {
        return;
    }

    cleanupTask.stop();
    cleanupTask.destroy();
    cleanupTask = null;
}

module.exports = {
    startTaskCleanupJob,
    stopTaskCleanupJob
};
