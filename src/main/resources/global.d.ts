declare const app: {
  name: string;
  version: string;
};

declare const log: {
  info: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
};
