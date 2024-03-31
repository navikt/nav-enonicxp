/* eslint-disable no-restricted-imports */
/* eslint-disable @typescript-eslint/no-unused-vars */

// This should cause type checks to fail if our patches for these libraries do not export
// the same fields as the base type declarations. If there are errors here, update the
// exports from the relevant patch files and ensure all exports from the base @enonic-types
// file is re-exported from the patch file.
// This won't work for pure type exports, only for function declarations/variables/etc

type AssertKeysAreEqual<
    TypeA extends Record<string, unknown>,
    TypeB extends Record<keyof TypeA, unknown>,
    // We need the parameter for "TypeA" twice, as type parameters can only reference previously
    // defined parameters. (Are there better ways to check for type equality?)
    TypeA2 extends Record<keyof TypeB, unknown> & TypeA,
> = never;

type LibContentBase = typeof import('@enonic-types/lib-content');
type LibContentPatched = typeof import('./lib-content');
type AssertLibContentPatchIsValid = AssertKeysAreEqual<
    LibContentBase,
    LibContentPatched,
    LibContentBase
>;

type LibNodeBase = typeof import('@enonic-types/lib-node');
type LibNodePatched = typeof import('./lib-node');
type AssertLibNodePatchIsValid = AssertKeysAreEqual<LibNodeBase, LibNodePatched, LibNodeBase>;

type LibPortalBase = typeof import('@enonic-types/lib-portal');
type LibPortalPatched = typeof import('./lib-portal');
type AssertLibPortalPatchIsValid = AssertKeysAreEqual<
    LibPortalBase,
    LibPortalPatched,
    LibPortalBase
>;
