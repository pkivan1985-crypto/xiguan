import pkg from '../../../package.json';

export const APP_VERSION = pkg.version;
export const APP_BUILD_ID = import.meta.env.VITE_APP_BUILD_ID?.trim() || APP_VERSION;
