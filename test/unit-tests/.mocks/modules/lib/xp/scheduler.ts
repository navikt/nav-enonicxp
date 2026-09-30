import { ScheduledJob } from '@enonic-types/lib-scheduler';

const jobs: ScheduledJob[] = [];

export const get = ({ name }: { name: string }) => jobs.find((job) => job.name === name) || null;
export const list = () => [...jobs];
export const create = (job: ScheduledJob) => {
	jobs.push(job);
	return job;
};
export const deleteJob = ({ name }: { name: string }) => {
	const index = jobs.findIndex((job) => job.name === name);

	if (index < 0) {
		return false;
	}

	jobs.splice(index, 1);
	return true;
};
export { deleteJob as delete };

export const __setJobs = (scheduledJobs: ScheduledJob[]) => {
	jobs.splice(0, jobs.length, ...scheduledJobs);
};
