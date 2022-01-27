// Includes type definitions for content-types in parameters and return values for XP functions

import * as xpContentLib from '/lib/xp/content';
import { ContentLibrary } from '../../types/xp-libs/content';
import * as xpPortalLib from '/lib/xp/portal';
import { PortalLibrary } from '../../types/xp-libs/portal';
import * as xpNodeLib from '/lib/xp/node';
import { NodeLibrary } from '../../types/xp-libs/node';

export const contentLib = xpContentLib as ContentLibrary;
export const portalLib = xpPortalLib as PortalLibrary;
export const nodeLib = xpNodeLib as NodeLibrary;
