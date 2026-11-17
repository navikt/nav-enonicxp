import { Request, Response } from '@enonic-types/core';
import { validateServiceSecretHeader } from '../utils/auth-utils';
import { logger } from '../utils/logging';
import { runInContext } from '../context/run-in-context';
import { getRepoConnection } from '../repos/repo-utils';
import { CONTENT_REPO_PREFIX } from '../constants';
import { RepoBranch } from '../../types/common';

// XP7: Exists only for the XP 7 -> 8 upgrade (finds content XP 8 refuses to save) and is removed with XP 7.

const DEFAULT_COUNT = 500;
const MAX_COUNT = 1000;
const PROJECT_PATTERN = /^[a-z0-9-]+$/;

type ScanError = {
    area: 'data' | 'mixin' | 'mixinNotAllowed' | 'page' | 'part' | 'layout' | 'siteConfig';
    kind: string;
    componentPath?: string;
    descriptor?: string;
    propertyPath?: string;
    inputType?: string;
    message: string;
};

type ScanResult = {
    found: boolean;
    path?: string;
    type?: string;
    inherited?: boolean;
    errors?: ScanError[];
    warnings?: ScanError[];
};

type ScannerBean = {
    scan: (contentId: string) => unknown;
};

const jsonResponse = (status: number, body: unknown): Response => ({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
});

const getStringParam = (req: Request, name: string) => {
    const value = req.params[name];
    return typeof value === 'string' ? value : undefined;
};

const parseIntParam = (value: string | undefined, fallback: number) => {
    const parsed = parseInt(value || '', 10);
    return isNaN(parsed) || parsed < 0 ? fallback : parsed;
};

export const xp8SaveValidationScanGet = (req: Request): Response => {
    if (!validateServiceSecretHeader(req)) {
        return jsonResponse(401, { message: 'Unauthorized' });
    }

    const project = getStringParam(req, 'project');
    if (!project || !PROJECT_PATTERN.test(project)) {
        return jsonResponse(400, { message: 'Invalid or missing project' });
    }

    const branch = (getStringParam(req, 'branch') || 'draft') as RepoBranch;
    if (branch !== 'draft' && branch !== 'master') {
        return jsonResponse(400, { message: 'Invalid branch' });
    }

    const start = parseIntParam(getStringParam(req, 'start'), 0);
    const count = Math.min(parseIntParam(getStringParam(req, 'count'), DEFAULT_COUNT), MAX_COUNT);
    const repoId = `${CONTENT_REPO_PREFIX}.${project}`;

    try {
        return runInContext({ repository: repoId, branch, asAdmin: true }, () => {
            const connection = getRepoConnection({ repoId, branch, asAdmin: true });
            const queryResult = connection.query({
                start,
                count,
                query: "_path LIKE '/content/*'",
                sort: '_path ASC',
            });

            const scanner = __.newBean(
                'no.nav.navno.xp8migration.SaveValidationScanner'
            ) as ScannerBean;

            const contents = queryResult.hits.reduce<
                Array<{
                    id: string;
                    path?: string;
                    type?: string;
                    inherited?: boolean;
                    errors: ScanError[];
                    warnings?: ScanError[];
                }>
            >((acc, hit) => {
                try {
                    const result = __.toNativeObject(scanner.scan(hit.id)) as ScanResult;
                    const errors = result.errors || [];
                    const warnings = result.warnings || [];
                    if (result.found && (errors.length > 0 || warnings.length > 0)) {
                        acc.push({
                            id: hit.id,
                            path: result.path,
                            type: result.type,
                            inherited: !!result.inherited,
                            errors,
                            warnings,
                        });
                    }
                } catch (e) {
                    logger.error(`Save validation scan failed for ${hit.id} - ${e}`);
                    acc.push({
                        id: hit.id,
                        errors: [{ area: 'data', kind: 'scanFailure', message: String(e) }],
                    });
                }
                return acc;
            }, []);

            return jsonResponse(200, {
                total: queryResult.total,
                scanned: queryResult.hits.length,
                contents,
            });
        });
    } catch (e) {
        logger.error(`Save validation scan failed for ${repoId} - ${e}`);
        return jsonResponse(500, { message: 'Save validation scan failed', error: String(e) });
    }
};
