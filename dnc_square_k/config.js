// Azure Blob Storage Configuration
const AZURE_CONFIG = {
    accountName: 'dncstorage11',
    sasToken: 'sv=2024-11-04&ss=bfqt&srt=sco&sp=rwdlacupiytfx&se=2025-11-28T13:57:59Z&st=2025-11-21T05:42:59Z&spr=https,http&sig=y8G2mjI1wM0liQ0kku2XQTHHOJnIgBXvEiY4Z0%2FZHN4%3D',
    
    // Container definitions
    containers: {
        images: 'images',
        documents: 'documents',
        votes: 'votes',
        worldcup: 'worldcup'
    },
    
    // Get blob service URL
    getBlobServiceUrl() {
        return `https://${this.accountName}.blob.core.windows.net`;
    },
    
    // Get container URL
    getContainerUrl(containerName) {
        return `${this.getBlobServiceUrl()}/${containerName}?${this.sasToken}`;
    },
    
    // Get blob URL
    getBlobUrl(containerName, blobName) {
        return `${this.getBlobServiceUrl()}/${containerName}/${blobName}?${this.sasToken}`;
    }
};

// Category definitions
const CATEGORIES = [
    {
        id: 'upload-images',
        name: '이미지 업로드',
        type: 'upload',
        container: 'images',
        icon: '📤'
    },
    {
        id: 'upload-docs',
        name: '문서 업로드',
        type: 'upload',
        container: 'documents',
        icon: '📄'
    },
    {
        id: 'gallery',
        name: '갤러리',
        type: 'gallery',
        container: 'images',
        icon: '🖼️'
    },
    {
        id: 'file-list',
        name: '파일 목록',
        type: 'filelist',
        container: 'documents',
        icon: '📁'
    },
    {
        id: 'voting',
        name: '이미지 투표',
        type: 'voting',
        container: 'images',
        icon: '🗳️'
    },
    {
        id: 'worldcup',
        name: '이미지 월드컵',
        type: 'worldcup',
        container: 'worldcup',
        icon: '🏆'
    },
    {
        id: 'worldcupgallery',
        name: '월드컵목록',
        type: 'gallery',
        container: 'worldcup',
        icon: '🏆'
    }
];
