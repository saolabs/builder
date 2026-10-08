export interface DistRoute {
    path: string;
    component: string;
    name?: string;
    meta?: Record<string, unknown>;
    children?: DistRoute[];
}
export interface DistContext {
    static?: { paths?: string[]; exclude?: string[]; origin?: string };
    enabled?: boolean;
    locales?: string[];
    includeViews?: string[];
    i18n?: { locale?: string; fallbackLocale?: string; messages?: Record<string, { json?: Record<string, string>; groups?: Record<string, any> }> };
    base?: string;
    baseUrl?: string;
    apiUrl?: string;
    apiKey?: string;
    apiKeyHeader?: string;
    entry?: string;
    html?: { title?: string; lang?: string; containerId?: string; bodyClass?: string; template?: string };
    router?: { mode?: 'history' | 'hash'; base?: string; defaultRoute?: string; routes?: DistRoute[] };
    view?: { systemData?: Record<string, unknown>; dataEndpoint?: string; fetchOptions?: RequestInit };
    api?: { baseUrl?: string; timeout?: number; headers?: Record<string, string>; endpoints?: Record<string, unknown> };
    assets?: { from: string; to: string }[];
    css?: string[] | false;
    styles?: string[];
    scripts?: string[];
    bundles?: string[];
    sourcemap?: boolean | 'inline' | 'hidden';
    /** Vite options except root, configFile, publicDir, base, input and outDir. */
    vite?: Record<string, any>;
}
export interface DistConfig {
    outDir?: string;
    staticOutDir?: string;
    staticBuild?: boolean;
    defaultContext?: string;
    contexts: Record<string, DistContext>;
}
export function defineDistConfig(config: DistConfig): DistConfig;
export function run(args?: string[]): Promise<void>;
export function loadDistConfig(projectRoot: string, filename?: string, sourceConfig?: Record<string, any>, mode?: string): Promise<DistConfig>;
export function buildContext(config: DistConfig, sourceConfig: Record<string, any>, context: string, projectRoot: string): Promise<string>;

export function resolveRuntimeConfig(config: DistConfig, projectRoot: string): Promise<DistConfig>;
export function exportRuntimeConfig(projectRoot: string, contexts: string[]): Promise<Record<string, any>>;
