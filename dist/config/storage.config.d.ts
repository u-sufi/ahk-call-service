export declare enum StorageProvider {
    S3 = "s3",
    AZURE = "azure",
    LOCAL = "local"
}
export declare class StorageConfig {
    provider: StorageProvider;
    s3Bucket: string;
    s3Region: string;
    s3AccessKey: string;
    s3SecretKey: string;
    azureConnectionString: string;
    azureContainer: string;
    localStoragePath: string;
}
