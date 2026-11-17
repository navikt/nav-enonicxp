import * as schedulerLib from '/lib/xp/scheduler';
import { runInContext } from '../context/run-in-context';

const weekdayNames: Record<string, string> = {
    '0': 'søndager',
    '1': 'mandager',
    '2': 'tirsdager',
    '3': 'onsdager',
    '4': 'torsdager',
    '5': 'fredager',
    '6': 'lørdager',
    '7': 'søndager',
};

const isNumber = (value: string) => /^\d+$/.test(value);

const pad = (value: string) => (value.length === 1 ? `0${value}` : value);

type ScheduleDescription = {
    text: string;
    // Run time as an ISO instant, so the browser can show it in Norwegian time all year
    time?: string;
};

const getGmtOffsetMinutes = (timeZone?: string) => {
    const match = timeZone ? /^GMT([+-])(\d{1,2})(?::?(\d{2}))?$/.exec(timeZone) : null;
    if (!match) {
        return null;
    }

    const minutes = Number(match[2]) * 60 + Number(match[3] || 0);
    return match[1] === '-' ? -minutes : minutes;
};

const getRunTimeToday = (hour: number, minute: number, offsetMinutes: number) => {
    const now = new Date();
    return new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hour, minute) -
            offsetMinutes * 60 * 1000
    ).toISOString();
};

// Handles the cron patterns we use, and falls back to the raw cron expression for anything else
export const formatCronSchedule = (cron: string, timeZone?: string): ScheduleDescription => {
    const fallback = { text: cron };

    const parts = cron.trim().split(/\s+/);
    if (parts.length !== 5) {
        return fallback;
    }

    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
    if (dayOfMonth !== '*' || month !== '*') {
        return fallback;
    }

    if (hour === '*' && dayOfWeek === '*') {
        if (minute === '*') {
            return { text: 'hvert minutt' };
        }

        const step = /^\*\/(\d+)$/.exec(minute);
        return step ? { text: `hvert ${step[1]}. minutt` } : fallback;
    }

    if (!isNumber(minute) || !isNumber(hour)) {
        return fallback;
    }

    const days = dayOfWeek === '*' ? 'daglig' : weekdayNames[dayOfWeek];
    if (!days) {
        return fallback;
    }

    const offsetMinutes = getGmtOffsetMinutes(timeZone);
    if (offsetMinutes === null) {
        return { text: `${days} kl. ${pad(hour)}.${pad(minute)}` };
    }

    return {
        text: `${days} kl.`,
        time: getRunTimeToday(Number(hour), Number(minute), offsetMinutes),
    };
};

export const getScheduleDescription = (jobName: string) => {
    const job = runInContext({ asAdmin: true }, () => schedulerLib.get({ name: jobName }));
    if (!job || job.schedule.type !== 'CRON') {
        return null;
    }

    return {
        ...formatCronSchedule(job.schedule.value, job.schedule.timeZone),
        isDisabled: !job.enabled,
    };
};
