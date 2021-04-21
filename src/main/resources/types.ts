/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
type LibMap = import('enonic-types/libs').EnonicLibraryMap;

declare const __non_webpack_require__: <K extends keyof LibMap | string = string>(
  path: K
) => K extends keyof LibMap ? LibMap[K] : any;

declare const resolve: (path: string) => any;

declare const app: {
  name: string;
  version: string;
};

declare const log: {
  info: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
};

declare const __: {
  newBean: (bean: string) => any;
  toNativeObject: (beanResult: any) => any;
};
