// Azure Blob Storage Operations
const StorageService = {
    // List all blobs in a container
    async listBlobs(containerName) {
        try {
            const url = `${AZURE_CONFIG.getBlobServiceUrl()}/${containerName}?restype=container&comp=list&${AZURE_CONFIG.sasToken}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error('Failed to list blobs');
            }
            
            const text = await response.text();
            const parser = new DOMParser();
            const xml = parser.parseFromString(text, 'text/xml');
            const blobs = xml.querySelectorAll('Blob');
            
            const blobList = [];
            blobs.forEach(blob => {
                const name = blob.querySelector('Name').textContent;
                const properties = blob.querySelector('Properties');
                const size = properties.querySelector('Content-Length').textContent;
                const contentType = properties.querySelector('Content-Type')?.textContent || '';
                const lastModified = properties.querySelector('Last-Modified').textContent;
                
                blobList.push({
                    name: name,
                    size: parseInt(size),
                    contentType: contentType,
                    lastModified: new Date(lastModified),
                    url: AZURE_CONFIG.getBlobUrl(containerName, name)
                });
            });
            
            return blobList;
        } catch (error) {
            console.error('Error listing blobs:', error);
            return [];
        }
    },

    // Upload a file to blob storage
    async uploadBlob(containerName, file, email, onProgress) {
        try {
            const blobName = `${Date.now()}_${file.name}`;
            const url = AZURE_CONFIG.getBlobUrl(containerName, blobName);
            
            const headers = {
                'x-ms-blob-type': 'BlockBlob',
                'Content-Type': file.type
            };
            
            // 이메일 정보를 메타데이터로 추가
            if (email) {
                headers['x-ms-meta-uploader'] = encodeURIComponent(email);
                headers['x-ms-meta-uploadtime'] = new Date().toISOString();
            }
            
            const response = await fetch(url, {
                method: 'PUT',
                headers: headers,
                body: file
            });
            
            if (!response.ok) {
                throw new Error('Failed to upload blob');
            }
            
            // 메타데이터 파일도 저장
            if (email) {
                await this.saveMetadata(containerName, blobName, email);
            }
            
            return {
                success: true,
                name: blobName,
                url: AZURE_CONFIG.getBlobUrl(containerName, blobName),
                email: email
            };
        } catch (error) {
            console.error('Error uploading blob:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },

    // Save metadata to a JSON file
    async saveMetadata(containerName, blobName, email) {
        try {
            const metadataFileName = 'metadata.json';
            let metadata = {};
            
            // 기존 메타데이터 읽기
            const exists = await this.blobExists(containerName, metadataFileName);
            if (exists) {
                const text = await this.readBlobAsText(containerName, metadataFileName);
                try {
                    metadata = JSON.parse(text);
                } catch {}
            }
            
            // 새 메타데이터 추가
            metadata[blobName] = {
                email: email,
                uploadTime: new Date().toISOString()
            };
            
            // 메타데이터 저장
            await this.writeBlobText(containerName, metadataFileName, JSON.stringify(metadata, null, 2));
        } catch (error) {
            console.error('Error saving metadata:', error);
        }
    },

    // Load metadata
    async loadMetadata(containerName) {
        try {
            const metadataFileName = 'metadata.json';
            const exists = await this.blobExists(containerName, metadataFileName);
            
            if (!exists) {
                return {};
            }
            
            const text = await this.readBlobAsText(containerName, metadataFileName);
            return JSON.parse(text);
        } catch (error) {
            console.error('Error loading metadata:', error);
            return {};
        }
    },

    // Download a blob
    async downloadBlob(containerName, blobName) {
        try {
            const url = AZURE_CONFIG.getBlobUrl(containerName, blobName);
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error('Failed to download blob');
            }
            
            return await response.blob();
        } catch (error) {
            console.error('Error downloading blob:', error);
            return null;
        }
    },

    // Read blob as text
    async readBlobAsText(containerName, blobName) {
        try {
            const url = AZURE_CONFIG.getBlobUrl(containerName, blobName);
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error('Failed to read blob');
            }
            
            return await response.text();
        } catch (error) {
            console.error('Error reading blob:', error);
            return null;
        }
    },

    // Write text to blob
    async writeBlobText(containerName, blobName, text) {
        try {
            const url = AZURE_CONFIG.getBlobUrl(containerName, blobName);
            
            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'x-ms-blob-type': 'BlockBlob',
                    'Content-Type': 'text/plain'
                },
                body: text
            });
            
            if (!response.ok) {
                throw new Error('Failed to write blob');
            }
            
            return true;
        } catch (error) {
            console.error('Error writing blob:', error);
            return false;
        }
    },

    // Check if blob exists
    async blobExists(containerName, blobName) {
        try {
            const url = AZURE_CONFIG.getBlobUrl(containerName, blobName);
            const response = await fetch(url, { method: 'HEAD' });
            return response.ok;
        } catch (error) {
            return false;
        }
    },

    // Helper: Check if file is an image
    isImage(contentType) {
        return contentType.startsWith('image/');
    },

    // Helper: Format file size
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    },

    // Helper: Get file icon based on content type
    getFileIcon(contentType) {
        if (contentType.startsWith('image/')) return '🖼️';
        if (contentType.startsWith('video/')) return '🎥';
        if (contentType.startsWith('audio/')) return '🎵';
        if (contentType.includes('pdf')) return '📕';
        if (contentType.includes('word')) return '📘';
        if (contentType.includes('excel') || contentType.includes('spreadsheet')) return '📊';
        if (contentType.includes('powerpoint') || contentType.includes('presentation')) return '📙';
        if (contentType.includes('zip') || contentType.includes('rar')) return '📦';
        if (contentType.includes('text')) return '📄';
        return '📎';
    }
};

// Browser Fingerprint - 사용자 식별
const BrowserFingerprint = {
    // 브라우저 핑거프린트 생성
    generate() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('Browser Fingerprint', 2, 2);
        const canvasData = canvas.toDataURL();
        
        const fingerprint = {
            userAgent: navigator.userAgent,
            language: navigator.language,
            platform: navigator.platform,
            screenResolution: `${screen.width}x${screen.height}`,
            colorDepth: screen.colorDepth,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            canvas: canvasData.substring(0, 50), // Canvas fingerprint 일부만 사용
            hardwareConcurrency: navigator.hardwareConcurrency || 0
        };
        
        const fingerprintString = JSON.stringify(fingerprint);
        return this.hashCode(fingerprintString);
    },
    
    // 간단한 해시 함수
    hashCode(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return 'fp_' + Math.abs(hash).toString(36);
    },
    
    // 브라우저 ID 가져오기 (localStorage에 저장)
    getId() {
        let browserId = localStorage.getItem('browser_id');
        if (!browserId) {
            browserId = this.generate();
            localStorage.setItem('browser_id', browserId);
        }
        return browserId;
    }
};

// Cookie helper functions
const CookieHelper = {
    set(name, value, days = 365) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        const expires = "expires=" + date.toUTCString();
        document.cookie = name + "=" + value + ";" + expires + ";path=/";
    },

    get(name) {
        const nameEQ = name + "=";
        const ca = document.cookie.split(';');
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) === ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
        }
        return null;
    },

    delete(name) {
        document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    }
};
