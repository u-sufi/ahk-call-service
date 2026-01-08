export declare class AppConfig {
    nodeEnv: string;
    port: number;
    appName: string;
    apiPrefix: string;
    get isDevelopment(): boolean;
    get isProduction(): boolean;
}
