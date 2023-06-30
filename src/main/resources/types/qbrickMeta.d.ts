export type QbrickMeta = {
    id: string;
    created: Date;
    updated: Date;
    tags: string[];
    rel: string[];
    asset?: QbrickAsset;
    metadata: QbrickMetadata;
    tracks: string[];
    catalog?: QbrickCatalog;
    thumbnails?: QbrickThumbnailRef[];
};

type QbrickThumbnailRef = {
    id: string;
};

type QbrickAsset = {
    id: string;
    created: Date;
    updated: Date;
    createdBy: QbrickCatalog;
    updatedBy: QbrickCatalog;
    name: string;
    rel: string[];
    resources: QbrickResource[];
    references: QbrickAssetReference[];
};

type QbrickCatalog = {
    id: string;
};

type QbrickAssetReference = {
    id: string;
    type: string;
};

type QbrickResource = {
    type: QbrickAssetType;
    id: string;
    rel: string[];
    renditions: QbrickRendition[];
    language?: string;
};

type QbrickRendition = {
    type: QbrickAssetType;
    width?: number;
    height?: number;
    id: string;
    size: number;
    links: QbrickLink[];
    references?: QbrickRenditionReference[];
    language?: string;
    videos?: QbrickVideo[];
};

type QbrickLink = {
    href: string;
    mimeType: string;
};

type QbrickRenditionReference = {
    order: number;
    item: QbrickItem;
};

type QbrickItem = {
    resource: QbrickCatalog;
    rendition: QbrickCatalog;
};

enum QbrickAssetType {
    Image = 'image',
    Index = 'index',
    Subtitle = 'subtitle',
    Video = 'video',
}

type QbrickVideo = {
    bitrate: number;
    codec: string;
    width: number;
    height: number;
    duration: number;
    audios: QbrickAudio[];
};

type QbrickAudio = {
    codec: string;
    sampleRate: number;
    bitDepth: number;
    channels: number;
};

type QbrickMetadata = {
    title: string;
};
