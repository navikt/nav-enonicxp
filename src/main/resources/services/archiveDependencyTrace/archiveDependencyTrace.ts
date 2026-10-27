import { Request } from '@enonic-types/core';
import * as contentLib from '/lib/xp/content';
import { Content } from '/lib/xp/content';
import { NodeVersion } from '/lib/xp/node';
import { validateServiceSecretHeader } from '../../lib/utils/auth-utils';
import { getLayersData, isValidLocale } from '../../lib/localization/layers-data';
import { runInContext } from '../../lib/context/run-in-context';
import { runInTimeTravelContext } from '../../lib/time-travel/run-with-time-travel';
import { RecordedFetch, runWithFetchRecording } from '../../lib/time-travel/dependency-recorder';
import { nodeLibConnectStandard } from '../../lib/time-travel/standard-functions';
import { runSitecontentGuillotineQuery } from '../../lib/guillotine/queries/run-sitecontent-query';
import { getNodeVersions, getTargetUnixTime } from '../../lib/utils/version-utils';
import { getUnixTimeFromDateTimeString } from '../../lib/utils/datetime-utils';
import { getContentNodeKey } from '../../lib/utils/content-utils';
import { isUUID } from '../../lib/utils/uuid';

// TEMPORARY - experiment for a complete archive. Remove with the archive-dependency-stats branch.
//
// Renders a page as it was at a given time, the same way the archive backfill does today
// (resolveToContentTimestamp in services/externalArchive/content), and records everything the
// time travel hooks fetch while rendering (lib/time-travel/dependency-recorder.ts). Answers: what
// did the page use at that time, when was each of these published next, and so when could the
// page change next. Read-only.
//
// GET ?id=<content id>&time=<ISO datetime in UTC>[&locale=<locale>][&steps=<n>]
//
// steps > 1 renders again at the next possible change, step by step, the way a backfill of every
// change would (at most 50 steps, stops after about 40 s to stay within the ingress timeout). Only
// the first step lists every dependency. Later steps show what changed in the rendered data, and
// what was added or removed.
//
// Not recorded, so changes to these are not found: content fetched in other ways than
// contentLib.get and repo.get, like contentLib.query (opening hours, form alerts, chapters, office
// editorial content, chat), and the default page template, which Guillotine finds in Java.

const MAX_STEPS = 50;
const MAX_TOTAL_MS = 40000;
const MAX_CHANGED_PATHS = 20;
const MAX_VALUE_LENGTH = 120;

type Dependency = {
    // The node id, or the requested key if no version was found
    id: string;
    repoId: string;
    // From the version used, or the next version if not published yet at this time
    path: string | null;
    type: string | null;
    via: string[];
    fetches: number;
    // The version time travel used. Empty if the content did not exist or was not published yet
    usedVersionId: string | null;
    usedVersionTime: string | null;
    // When the next version was published, the next time this can change the page
    nextPublish: string | null;
};

type DependencyRef = Pick<Dependency, 'id' | 'path' | 'type'>;

type ChangedPath = { path: string; before?: string; after?: string };

type Step = {
    time: string;
    effectiveTime: string;
    renderMs: number;
    lookupMs: number;
    hash: string | null;
    changed: boolean | null;
    changedPaths?: ChangedPath[];
    page: Pick<Dependency, 'usedVersionId' | 'usedVersionTime' | 'path' | 'type'> | null;
    dependencyCount: number;
    dependencies?: Dependency[];
    added?: DependencyRef[];
    removed?: DependencyRef[];
    nextChange: { time: string; causes: DependencyRef[] } | null;
    error?: string;
};

type Previous = { renderProps: unknown; hash: string | null; refs: Record<string, DependencyRef> };

const jsonResponse = (status: number, body: unknown) => ({
    status,
    contentType: 'application/json',
    body,
});

const sha256 = (value: string) => {
    const MessageDigest = Java.type('java.security.MessageDigest');
    const JavaString = Java.type('java.lang.String');
    const bytes = MessageDigest.getInstance('SHA-256').digest(
        new JavaString(value).getBytes('UTF-8')
    );

    let hex = '';
    for (let i = 0; i < bytes.length; i++) {
        hex += ((bytes[i] & 0xff) + 0x100).toString(16).slice(1);
    }

    return hex;
};

const toRef = ({ id, path, type }: Dependency): DependencyRef => ({ id, path, type });

const getContentType = (version: NodeVersion & { repoId: string }) =>
    nodeLibConnectStandard({ repoId: version.repoId, branch: 'draft' }).get<Content>({
        key: version.nodeId,
        versionId: version.versionId,
    })?.type ?? null;

// Time travel picks the newest published version saved at or before the requested time, compared
// in whole seconds (getContentVersionFromTime). The first version saved after that time is the
// next one time travel can pick
const findNextVersion = (nodeKey: string, repoId: string, afterUnixTime: number) =>
    getNodeVersions({ nodeKey, repoId, branch: 'master' }).reduce<NodeVersion | null>(
        (earliest, version) => {
            const unixTime = getUnixTimeFromDateTimeString(version.timestamp);
            if (unixTime <= afterUnixTime) {
                return earliest;
            }

            return !earliest || unixTime < getUnixTimeFromDateTimeString(earliest.timestamp)
                ? version
                : earliest;
        },
        null
    );

const toDependencies = (fetches: RecordedFetch[], afterUnixTime: number) => {
    const dependencies: Record<string, Dependency> = {};

    fetches.forEach(({ via, nodeKey, repoId, version }) => {
        const id = version?.nodeId ?? nodeKey;
        const dependencyRepoId = version?.repoId ?? repoId;
        const key = `${dependencyRepoId}:${id}`;

        const existing = dependencies[key];
        if (existing) {
            existing.fetches += 1;
            if (existing.via.indexOf(via) === -1) {
                existing.via.push(via);
            }
            return;
        }

        const nextVersion = findNextVersion(id, dependencyRepoId, afterUnixTime);
        // Content not published yet at this time is described by the version that comes next
        const describedBy =
            version ?? (nextVersion && { ...nextVersion, repoId: dependencyRepoId });

        dependencies[key] = {
            id,
            repoId: dependencyRepoId,
            path: describedBy?.nodePath ?? null,
            type: describedBy ? getContentType(describedBy) : null,
            via: [via],
            fetches: 1,
            usedVersionId: version?.versionId ?? null,
            usedVersionTime: version?.timestamp ?? null,
            nextPublish: nextVersion?.timestamp ?? null,
        };
    });

    return dependencies;
};

const findNextChange = (dependencies: Dependency[]): Step['nextChange'] => {
    const withNextPublish = dependencies.filter((dependency) => dependency.nextPublish);
    if (withNextPublish.length === 0) {
        return null;
    }

    const earliest = Math.min(
        ...withNextPublish.map((dependency) =>
            getUnixTimeFromDateTimeString(dependency.nextPublish)
        )
    );
    const causes = withNextPublish.filter(
        (dependency) => getUnixTimeFromDateTimeString(dependency.nextPublish) === earliest
    );

    return { time: causes[0].nextPublish as string, causes: causes.map(toRef) };
};

const shorten = (value: unknown) => {
    const json = JSON.stringify(value);
    if (json === undefined) {
        return undefined;
    }

    return json.length > MAX_VALUE_LENGTH ? `${json.slice(0, MAX_VALUE_LENGTH)}...` : json;
};

const isContainer = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null;

// Sorted keys, so the hash changes when the content changes, not when the key order does
const toStableJson = (value: unknown): string => {
    if (Array.isArray(value)) {
        return `[${value.map(toStableJson).join(',')}]`;
    }

    if (isContainer(value)) {
        const entries = Object.keys(value)
            .sort()
            .filter((key) => value[key] !== undefined)
            .map((key) => `${JSON.stringify(key)}:${toStableJson(value[key])}`);

        return `{${entries.join(',')}}`;
    }

    return JSON.stringify(value) ?? 'null';
};

// Guillotine gives every macro, link and image in rich text a new random id on every render
// (MacroDecorator and CustomHtmlPostProcessor in lib-guillotine). The ids only link the
// placeholders in processedHtml to the macros, links and images lists, so they are replaced with
// the order they first appear in
const normalizeRichTextRefs = (json: string) => {
    const refs: string[] = [];
    const refPattern = /data-(?:macro|link|image)-ref=\\"([0-9a-f-]{36})\\"/g;

    let match = refPattern.exec(json);
    while (match) {
        if (refs.indexOf(match[1]) === -1) {
            refs.push(match[1]);
        }
        match = refPattern.exec(json);
    }

    // split/join, since replaceAll may be missing in the XP script engine
    return refs.reduce((result, ref, index) => result.split(ref).join(`ref-${index}`), json);
};

const findChangedPaths = (
    before: unknown,
    after: unknown,
    path: string,
    result: ChangedPath[]
): ChangedPath[] => {
    if (result.length >= MAX_CHANGED_PATHS) {
        return result;
    }

    if (
        isContainer(before) &&
        isContainer(after) &&
        Array.isArray(before) === Array.isArray(after)
    ) {
        const keys = Object.keys(before).concat(
            Object.keys(after).filter((key) => !(key in before))
        );
        keys.forEach((key) => findChangedPaths(before[key], after[key], `${path}/${key}`, result));
        return result;
    }

    if (JSON.stringify(before) !== JSON.stringify(after)) {
        result.push({ path: path || '/', before: shorten(before), after: shorten(after) });
    }

    return result;
};

const renderAt = (contentId: string, repoId: string, time: string) => {
    const startTime = Date.now();

    const { result, fetches } = runWithFetchRecording(() =>
        runInTimeTravelContext(
            { dateTime: time, repoId, branch: 'master', baseContentKey: contentId },
            () => {
                // Goes through the time travel hook, so this is the page as it was at the time
                const page = contentLib.get({ key: contentId });
                return page ? runSitecontentGuillotineQuery(page, 'draft') : null;
            }
        )
    );

    return { renderProps: result, fetches, renderMs: Date.now() - startTime };
};

const renderStep = (
    contentId: string,
    repoId: string,
    time: string,
    previous: Previous | null
): { step: Step; current: Previous } => {
    // Same as runInTimeTravelContext: before the first version of the page, the first version is used
    const effectiveUnixTime = getTargetUnixTime({
        nodeKey: getContentNodeKey(contentId),
        requestedUnixTime: getUnixTimeFromDateTimeString(time),
        repoId,
        branch: 'master',
    });

    const { renderProps, fetches, renderMs } = renderAt(contentId, repoId, time);

    const lookupStart = Date.now();
    const dependenciesByKey = toDependencies(fetches, effectiveUnixTime);
    const dependencies = Object.keys(dependenciesByKey).map((key) => dependenciesByKey[key]);
    const lookupMs = Date.now() - lookupStart;

    const page = dependencies.find((dependency) => dependency.id === contentId);

    // Compared without the random ids in rich text, both for the hash and for changedPaths
    const comparableJson = renderProps ? normalizeRichTextRefs(toStableJson(renderProps)) : null;
    const comparable: unknown = comparableJson ? JSON.parse(comparableJson) : null;
    const hash = comparableJson ? sha256(comparableJson) : null;

    const refs: Record<string, DependencyRef> = {};
    Object.keys(dependenciesByKey).forEach((key) => {
        refs[key] = toRef(dependenciesByKey[key]);
    });

    const step: Step = {
        time,
        effectiveTime: new Date(effectiveUnixTime).toISOString(),
        renderMs,
        lookupMs,
        hash,
        changed: previous ? hash !== previous.hash : null,
        page: page
            ? {
                  usedVersionId: page.usedVersionId,
                  usedVersionTime: page.usedVersionTime,
                  path: page.path,
                  type: page.type,
              }
            : null,
        dependencyCount: dependencies.length,
        nextChange: findNextChange(dependencies),
    };

    if (!renderProps) {
        step.error = 'The page was not found at this time';
    }

    if (!previous) {
        step.dependencies = dependencies;
    } else {
        step.added = Object.keys(refs)
            .filter((key) => !previous.refs[key])
            .map((key) => refs[key]);
        step.removed = Object.keys(previous.refs)
            .filter((key) => !refs[key])
            .map((key) => previous.refs[key]);

        if (step.changed) {
            step.changedPaths = findChangedPaths(previous.renderProps, comparable, '', []);
        }
    }

    return { step, current: { renderProps: comparable, hash, refs } };
};

const trace = (contentId: string, locale: string, startTime: string, maxSteps: number) => {
    const repoId = getLayersData().localeToRepoIdMap[locale];
    const steps: Step[] = [];
    const startedAt = Date.now();

    let previous: Previous | null = null;
    let time: string | null = startTime;
    let totalRenderMs = 0;
    let stoppedBecause = 'no more changes';

    while (time) {
        const stepTime: string = time;

        if (steps.length >= maxSteps) {
            stoppedBecause = `reached steps=${maxSteps}, continue from the last nextChange`;
            break;
        }
        if (Date.now() - startedAt >= MAX_TOTAL_MS) {
            stoppedBecause = 'time limit, continue from the last nextChange';
            break;
        }

        try {
            const { step, current } = renderStep(contentId, repoId, stepTime, previous);
            steps.push(step);
            totalRenderMs += step.renderMs;
            previous = current;
            time = step.error ? null : (step.nextChange?.time ?? null);
            if (step.error) {
                stoppedBecause = step.error;
            }
        } catch (e) {
            steps.push({
                time: stepTime,
                effectiveTime: stepTime,
                renderMs: 0,
                lookupMs: 0,
                hash: null,
                changed: null,
                page: null,
                dependencyCount: 0,
                nextChange: null,
                error: `Rendering failed: ${e}`,
            });
            stoppedBecause = 'error';
            break;
        }
    }

    const warnings = steps.some((step) => !step.error && step.dependencyCount === 0)
        ? [
              'No fetches were recorded, so the recording id did not reach the time travel hooks. See lib/time-travel/dependency-recorder.ts',
          ]
        : [];

    return {
        id: contentId,
        locale,
        renders: steps.length,
        changedRenders: steps.filter((step) => step.changed).length,
        totalMs: Date.now() - startedAt,
        totalRenderMs,
        averageRenderMs: steps.length > 0 ? Math.round(totalRenderMs / steps.length) : 0,
        stoppedBecause,
        warnings,
        steps,
    };
};

export const get = (req: Request) => {
    if (!validateServiceSecretHeader(req)) {
        return { status: 401 };
    }

    const id = req.params.id as string | undefined;
    if (!id || !isUUID(id)) {
        return jsonResponse(400, { message: 'Parameter "id" must be a content id' });
    }

    const time = req.params.time as string | undefined;
    if (!time || isNaN(getUnixTimeFromDateTimeString(time))) {
        return jsonResponse(400, {
            message: 'Parameter "time" must be an ISO datetime in UTC, e.g. 2024-03-01T12:00:00Z',
        });
    }

    const locale = (req.params.locale as string | undefined) || getLayersData().defaultLocale;
    if (!isValidLocale(locale)) {
        return jsonResponse(400, { message: `Invalid locale: ${locale}` });
    }

    const stepsParam = req.params.steps as string | undefined;
    if (stepsParam && !/^[1-9]\d*$/.test(stepsParam)) {
        return jsonResponse(400, { message: 'Parameter "steps" must be a positive integer' });
    }

    const steps = Math.min(stepsParam ? Number(stepsParam) : 1, MAX_STEPS);

    return jsonResponse(
        200,
        runInContext({ asAdmin: true }, () => trace(id, locale, time, steps))
    );
};
