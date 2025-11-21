// Main Application
class DungeonCopilotApp {
    constructor() {
        this.currentCategory = null;
        this.currentView = 'small'; // for gallery
        this.worldCupState = null;
        this.isVoting = false; // 투표 처리 중 플래그
        this.init();
    }

    init() {
        this.renderSidebar();
        this.setupModal();
        
        // URL 파라미터에서 카테고리 ID 가져오기
        const urlParams = new URLSearchParams(window.location.search);
        const categoryId = urlParams.get('category');
        
        // URL 파라미터로 지정된 카테고리가 있으면 해당 카테고리 로드
        if (categoryId) {
            const category = CATEGORIES.find(c => c.id === categoryId);
            if (category) {
                this.loadCategory(categoryId);
                return;
            }
        }
        
        // 파라미터가 없거나 유효하지 않으면 첫 번째 카테고리 로드
        if (CATEGORIES.length > 0) {
            this.loadCategory(CATEGORIES[0].id);
        }
    }

    renderSidebar() {
        const sidebar = document.getElementById('sidebar');
        sidebar.innerHTML = '';

        CATEGORIES.forEach(category => {
            const item = document.createElement('div');
            item.className = 'category-item';
            item.dataset.categoryId = category.id;
            item.innerHTML = `
                <span class="category-icon">${category.icon}</span>
                <span class="category-name">${category.name}</span>
            `;
            item.addEventListener('click', () => this.loadCategory(category.id));
            sidebar.appendChild(item);
        });
    }

    loadCategory(categoryId) {
        const category = CATEGORIES.find(c => c.id === categoryId);
        if (!category) return;

        this.currentCategory = category;

        // Update URL parameter without reloading
        const url = new URL(window.location);
        url.searchParams.set('category', categoryId);
        window.history.pushState({}, '', url);

        // Update active state
        document.querySelectorAll('.category-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.categoryId === categoryId) {
                item.classList.add('active');
            }
        });

        // Update title
        document.getElementById('content-title').textContent = category.name;

        // Load appropriate view
        switch (category.type) {
            case 'upload':
                this.renderUploadView(category);
                break;
            case 'gallery':
                this.renderGalleryView(category);
                break;
            case 'filelist':
                this.renderFileListView(category);
                break;
            case 'voting':
                this.renderVotingView(category);
                break;
            case 'worldcup':
                this.renderWorldCupView(category);
                break;
            default:
                this.renderDefaultView();
        }
    }

    // Upload View
    renderUploadView(category) {
        const contentBody = document.getElementById('content-body');
        contentBody.innerHTML = `
            <div class="upload-area" id="upload-area">
                <h3>📤 파일 업로드</h3>
                <p>클릭하거나 파일을 드래그하여 업로드하세요</p>
                <input type="file" id="file-input" multiple style="display: none;">
                <button class="upload-btn" id="upload-btn">파일 선택</button>
            </div>
            <div class="preview-container" id="preview-container"></div>
        `;

        const fileInput = document.getElementById('file-input');
        const uploadBtn = document.getElementById('upload-btn');
        const uploadArea = document.getElementById('upload-area');
        const previewContainer = document.getElementById('preview-container');

        uploadBtn.addEventListener('click', () => fileInput.click());
        
        fileInput.addEventListener('change', (e) => {
            this.handleFileSelect(e.target.files, category, previewContainer);
        });

        // Drag and drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '#2980b9';
            uploadArea.style.background = '#f0f8ff';
        });

        uploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '#3498db';
            uploadArea.style.background = 'white';
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '#3498db';
            uploadArea.style.background = 'white';
            this.handleFileSelect(e.dataTransfer.files, category, previewContainer);
        });
    }

    async handleFileSelect(files, category, previewContainer) {
        previewContainer.innerHTML = '';

        for (let file of files) {
            const previewItem = document.createElement('div');
            previewItem.className = 'preview-item';

            if (file.type.startsWith('image/')) {
                const img = document.createElement('img');
                img.src = URL.createObjectURL(file);
                previewItem.appendChild(img);
            }

            const fileName = document.createElement('p');
            fileName.textContent = file.name;
            fileName.style.fontSize = '0.85rem';
            fileName.style.marginTop = '5px';
            previewItem.appendChild(fileName);

            // 이메일 입력 필드 추가
            const emailInput = document.createElement('input');
            emailInput.type = 'email';
            emailInput.placeholder = '이메일 주소';
            emailInput.style.width = '100%';
            emailInput.style.padding = '8px';
            emailInput.style.marginTop = '10px';
            emailInput.style.border = '1px solid #ddd';
            emailInput.style.borderRadius = '4px';
            emailInput.style.fontSize = '0.85rem';
            previewItem.appendChild(emailInput);

            const uploadButton = document.createElement('button');
            uploadButton.className = 'upload-btn';
            uploadButton.textContent = '업로드';
            uploadButton.style.marginTop = '10px';
            uploadButton.style.padding = '8px 16px';
            uploadButton.style.fontSize = '0.85rem';

            uploadButton.addEventListener('click', async () => {
                const email = emailInput.value.trim();
                
                if (!email) {
                    alert('이메일 주소를 입력해주세요.');
                    return;
                }
                
                // 이메일 형식 검증
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(email)) {
                    alert('올바른 이메일 주소를 입력해주세요.');
                    return;
                }
                
                uploadButton.textContent = '업로드 중...';
                uploadButton.disabled = true;
                emailInput.disabled = true;

                const result = await StorageService.uploadBlob(category.container, file, email);
                
                if (result.success) {
                    uploadButton.textContent = '완료!';
                    uploadButton.style.background = '#27ae60';
                    setTimeout(() => {
                        previewItem.remove();
                    }, 1000);
                } else {
                    uploadButton.textContent = '실패';
                    uploadButton.style.background = '#e74c3c';
                    uploadButton.disabled = false;
                    emailInput.disabled = false;
                }
            });

            previewItem.appendChild(uploadButton);
            previewContainer.appendChild(previewItem);
        }
    }

    // Gallery View
    async renderGalleryView(category) {
        const contentBody = document.getElementById('content-body');
        contentBody.innerHTML = `
            <div class="gallery-controls">
                <button class="control-btn active" data-view="small">작게보기</button>
                <button class="control-btn" data-view="large">크게보기</button>
                <button class="control-btn" id="refresh-gallery">새로고침</button>
            </div>
            <div class="loading">
                <div class="spinner"></div>
                <p>이미지를 불러오는 중...</p>
            </div>
            <div class="gallery-grid" id="gallery-grid" style="display: none;"></div>
        `;

        // View toggle
        document.querySelectorAll('.control-btn[data-view]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.control-btn[data-view]').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentView = e.target.dataset.view;
                const grid = document.getElementById('gallery-grid');
                grid.className = this.currentView === 'large' ? 'gallery-grid large' : 'gallery-grid';
            });
        });

        document.getElementById('refresh-gallery').addEventListener('click', () => {
            this.renderGalleryView(category);
        });

        await this.loadGalleryImages(category);
    }

    async loadGalleryImages(category) {
        const blobs = await StorageService.listBlobs(category.container);
        const images = blobs.filter(blob => StorageService.isImage(blob.contentType));
        const metadata = await StorageService.loadMetadata(category.container);

        const loading = document.querySelector('.loading');
        const grid = document.getElementById('gallery-grid');
        
        loading.style.display = 'none';
        grid.style.display = 'grid';
        grid.innerHTML = '';

        if (images.length === 0) {
            grid.innerHTML = '<p>업로드된 이미지가 없습니다.</p>';
            return;
        }

        images.forEach(image => {
            const uploaderInfo = metadata[image.name];
            const uploaderEmail = uploaderInfo ? uploaderInfo.email : '알 수 없음';
            
            const item = document.createElement('div');
            item.className = 'gallery-item';
            item.innerHTML = `
                <img src="${image.url}" alt="${image.name}">
                <div class="uploader-info">👤 ${uploaderEmail}</div>
            `;
            item.addEventListener('click', () => this.showImageModal(image.url, image.name, uploaderEmail));
            grid.appendChild(item);
        });
    }

    // File List View
    async renderFileListView(category) {
        const contentBody = document.getElementById('content-body');
        contentBody.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <p>파일 목록을 불러오는 중...</p>
            </div>
            <div class="file-list" id="file-list" style="display: none;"></div>
        `;

        await this.loadFileList(category);
    }

    async loadFileList(category) {
        const blobs = await StorageService.listBlobs(category.container);

        const loading = document.querySelector('.loading');
        const fileList = document.getElementById('file-list');
        
        loading.style.display = 'none';
        fileList.style.display = 'block';
        fileList.innerHTML = '';

        if (blobs.length === 0) {
            fileList.innerHTML = '<p style="padding: 20px;">업로드된 파일이 없습니다.</p>';
            return;
        }

        blobs.forEach(blob => {
            const item = document.createElement('div');
            item.className = 'file-item';
            item.innerHTML = `
                <span class="file-icon">${StorageService.getFileIcon(blob.contentType)}</span>
                <div class="file-info">
                    <div class="file-name">${blob.name}</div>
                    <div class="file-size">${StorageService.formatFileSize(blob.size)} • ${blob.lastModified.toLocaleDateString('ko-KR')}</div>
                </div>
            `;
            item.addEventListener('click', () => this.showFileDetails(blob));
            fileList.appendChild(item);
        });
    }

    // Voting View
    async renderVotingView(category) {
        const contentBody = document.getElementById('content-body');
        contentBody.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <p>투표 데이터를 불러오는 중...</p>
            </div>
            <div class="voting-grid" id="voting-grid" style="display: none;"></div>
        `;

        await this.loadVotingImages(category);
    }

    async loadVotingImages(category) {
        const blobs = await StorageService.listBlobs(category.container);
        const images = blobs.filter(blob => StorageService.isImage(blob.contentType));

        // Load vote data
        const voteData = await this.loadVoteData(category.container);
        const votes = voteData.votes;
        const voters = voteData.voters;
        const browserId = BrowserFingerprint.getId();
        const metadata = await StorageService.loadMetadata(category.container);
        
        // 브라우저가 투표한 이미지 찾기
        let myVote = null;
        for (const img in voters) {
            if (voters[img] && voters[img].includes(browserId)) {
                myVote = img;
                break;
            }
        }
        
        // 쿠키도 업데이트
        if (myVote) {
            CookieHelper.set('vote_' + category.id, myVote);
        }

        const loading = document.querySelector('.loading');
        const grid = document.getElementById('voting-grid');
        
        loading.style.display = 'none';
        grid.style.display = 'grid';
        grid.innerHTML = '';

        if (images.length === 0) {
            grid.innerHTML = '<p>투표할 이미지가 없습니다.</p>';
            return;
        }

        images.forEach(image => {
            const voteCount = votes[image.name] || 0;
            const isVoted = myVote === image.name;
            const uploaderInfo = metadata[image.name];
            const uploaderEmail = uploaderInfo ? uploaderInfo.email : '알 수 없음';

            const item = document.createElement('div');
            item.className = 'voting-item';
            item.innerHTML = `
                <img src="${image.url}" alt="${image.name}">
                <div class="vote-badge">${voteCount} 표</div>
                <div class="uploader-info">👤 ${uploaderEmail}</div>
                <div class="voting-controls">
                    <button class="vote-btn ${isVoted ? 'voted' : ''}" data-image="${image.name}">
                        ${isVoted ? '✓ 투표함' : '투표하기'}
                    </button>
                </div>
            `;

            const voteBtn = item.querySelector('.vote-btn');
            voteBtn.addEventListener('click', async () => {
                // 이미 처리 중이거나 이미 투표한 경우 무시
                if (voteBtn.disabled || isVoted) {
                    return;
                }
                
                voteBtn.disabled = true;
                voteBtn.textContent = '처리 중...';
                
                await this.handleVote(category, image.name);
            });

            grid.appendChild(item);
        });
    }

    async loadVoteData(containerName) {
        const voteFileName = 'votes.json';
        const exists = await StorageService.blobExists(containerName, voteFileName);
        
        if (!exists) {
            return { votes: {}, voters: {} };
        }

        const text = await StorageService.readBlobAsText(containerName, voteFileName);
        try {
            const data = JSON.parse(text);
            // 이전 버전 호환성 (votes만 있는 경우)
            if (!data.voters) {
                return { votes: data, voters: {} };
            }
            return data;
        } catch {
            return { votes: {}, voters: {} };
        }
    }

    async handleVote(category, imageName) {
        // 이미 처리 중이면 무시
        if (this.isVoting) {
            return;
        }
        
        // 브라우저 ID 가져오기
        const browserId = BrowserFingerprint.getId();
        const oldVote = CookieHelper.get('vote_' + category.id);
        
        // 이미 같은 이미지에 투표한 경우 무시
        if (oldVote === imageName) {
            return;
        }
        
        // 투표 처리 시작
        this.isVoting = true;
        
        try {
            const voteData = await this.loadVoteData(category.container);
            const votes = voteData.votes;
            const voters = voteData.voters;

            // 이미 투표한 적이 있는지 확인
            let hasVoted = false;
            for (const img in voters) {
                if (voters[img] && voters[img].includes(browserId)) {
                    hasVoted = true;
                    // 이전 투표 제거
                    if (votes[img]) {
                        votes[img]--;
                        if (votes[img] < 0) votes[img] = 0;
                    }
                    // 브라우저 ID 목록에서 제거
                    voters[img] = voters[img].filter(id => id !== browserId);
                    break;
                }
            }

            // 새로운 투표 추가
            votes[imageName] = (votes[imageName] || 0) + 1;
            
            // 브라우저 ID 목록에 추가
            if (!voters[imageName]) {
                voters[imageName] = [];
            }
            voters[imageName].push(browserId);

            // Save vote data
            await StorageService.writeBlobText(
                category.container,
                'votes.json',
                JSON.stringify({ votes, voters }, null, 2)
            );

            // Save cookie
            CookieHelper.set('vote_' + category.id, imageName);

            // Refresh view
            await this.renderVotingView(category);
        } finally {
            // 투표 처리 완료
            this.isVoting = false;
        }
    }

    // World Cup View
    async renderWorldCupView(category) {
        const contentBody = document.getElementById('content-body');
        contentBody.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <p>이미지 월드컵을 준비하는 중...</p>
            </div>
            <div class="worldcup-container" id="worldcup-container" style="display: none;"></div>
        `;

        await this.startWorldCup(category);
    }

    async startWorldCup(category) {
        const blobs = await StorageService.listBlobs(category.container);
        const images = blobs.filter(blob => StorageService.isImage(blob.contentType));
        const metadata = await StorageService.loadMetadata(category.container);

        const loading = document.querySelector('.loading');
        const container = document.getElementById('worldcup-container');
        
        loading.style.display = 'none';
        container.style.display = 'block';

        if (images.length < 2) {
            container.innerHTML = '<p>월드컵을 시작하려면 최소 2개의 이미지가 필요합니다.</p>';
            return;
        }

        // Initialize world cup state
        this.worldCupState = {
            category: category,
            allImages: images,
            currentRound: images.slice(),
            nextRound: [],
            currentMatch: 0,
            metadata: metadata
        };

        this.showWorldCupMatch();
    }

    showWorldCupMatch() {
        const state = this.worldCupState;
        const container = document.getElementById('worldcup-container');

        if (state.currentMatch >= state.currentRound.length) {
            // Move to next round
            if (state.nextRound.length === 1) {
                // Winner!
                this.showWorldCupWinner(state.nextRound[0]);
                return;
            }
            state.currentRound = state.nextRound;
            state.nextRound = [];
            state.currentMatch = 0;
        }

        const img1 = state.currentRound[state.currentMatch];
        const img2 = state.currentRound[state.currentMatch + 1];

        if (!img2) {
            // Odd number, auto-advance
            state.nextRound.push(img1);
            state.currentMatch += 2;
            this.showWorldCupMatch();
            return;
        }

        const roundSize = state.currentRound.length;
        const roundName = roundSize === 2 ? '결승' : roundSize === 4 ? '준결승' : `${roundSize}강`;
        
        const uploader1 = state.metadata[img1.name];
        const uploader2 = state.metadata[img2.name];
        const email1 = uploader1 ? uploader1.email : '알 수 없음';
        const email2 = uploader2 ? uploader2.email : '알 수 없음';

        container.innerHTML = `
            <div class="worldcup-round">${roundName}</div>
            <div class="worldcup-battle">
                <div class="worldcup-candidate" data-winner="0">
                    <img src="${img1.url}" alt="${img1.name}">
                    <div class="uploader-info" style="text-align: center; padding: 10px;">👤 ${email1}</div>
                </div>
                <div class="worldcup-vs">VS</div>
                <div class="worldcup-candidate" data-winner="1">
                    <img src="${img2.url}" alt="${img2.name}">
                    <div class="uploader-info" style="text-align: center; padding: 10px;">👤 ${email2}</div>
                </div>
            </div>
        `;

        document.querySelectorAll('.worldcup-candidate').forEach((elem, index) => {
            elem.addEventListener('click', () => {
                const winner = index === 0 ? img1 : img2;
                state.nextRound.push(winner);
                state.currentMatch += 2;
                this.showWorldCupMatch();
            });
        });
    }

    showWorldCupWinner(winner) {
        const state = this.worldCupState;
        const uploaderInfo = state.metadata[winner.name];
        const uploaderEmail = uploaderInfo ? uploaderInfo.email : '알 수 없음';
        
        const container = document.getElementById('worldcup-container');
        container.innerHTML = `
            <div class="worldcup-result">
                <h3>🏆 우승!</h3>
                <div class="worldcup-winner">
                    <img src="${winner.url}" alt="${winner.name}">
                </div>
                <p style="margin-top: 15px; font-weight: bold;">${winner.name}</p>
                <p style="margin-top: 10px; color: #7f8c8d;">👤 업로드: ${uploaderEmail}</p>
                <button class="upload-btn" style="margin-top: 20px;" id="restart-worldcup">다시 시작</button>
            </div>
        `;

        document.getElementById('restart-worldcup').addEventListener('click', () => {
            this.startWorldCup(this.worldCupState.category);
        });
    }

    // Modal functions
    setupModal() {
        const modal = document.getElementById('modal');
        const closeBtn = document.getElementById('modal-close');

        closeBtn.addEventListener('click', () => {
            modal.classList.remove('active');
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    }

    showImageModal(url, name, uploaderEmail) {
        const modal = document.getElementById('modal');
        const modalBody = document.getElementById('modal-body');
        
        const emailInfo = uploaderEmail ? `<p style="text-align: center; margin-top: 10px; color: #7f8c8d;">👤 업로드: ${uploaderEmail}</p>` : '';
        
        modalBody.innerHTML = `
            <img src="${url}" alt="${name}" class="modal-image">
            <p style="text-align: center; margin-top: 15px; color: #7f8c8d;">${name}</p>
            ${emailInfo}
        `;
        
        modal.classList.add('active');
    }

    showFileDetails(blob) {
        const modal = document.getElementById('modal');
        const modalBody = document.getElementById('modal-body');
        
        let content = '';
        if (StorageService.isImage(blob.contentType)) {
            content = `<img src="${blob.url}" alt="${blob.name}" class="modal-image">`;
        }

        modalBody.innerHTML = `
            ${content}
            <div style="margin-top: 20px;">
                <h3>${blob.name}</h3>
                <p><strong>크기:</strong> ${StorageService.formatFileSize(blob.size)}</p>
                <p><strong>타입:</strong> ${blob.contentType}</p>
                <p><strong>업로드 날짜:</strong> ${blob.lastModified.toLocaleString('ko-KR')}</p>
                <a href="${blob.url}" download="${blob.name}" class="upload-btn" style="display: inline-block; margin-top: 15px; text-decoration: none;">다운로드</a>
            </div>
        `;
        
        modal.classList.add('active');
    }

    renderDefaultView() {
        const contentBody = document.getElementById('content-body');
        contentBody.innerHTML = '<p>왼쪽 메뉴에서 카테고리를 선택해주세요.</p>';
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new DungeonCopilotApp();
});
