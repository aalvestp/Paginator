// PDF Paginator - Remote Control Web Interface
// Version 2.0.0

class PaginatorClient {
    constructor() {
        this.ws = null;
        this.connected = false;
        this.files = [];
        this.agentUrl = localStorage.getItem('agentUrl') || 'ws://localhost:3838';
        this.apiKey = localStorage.getItem('apiKey') || '';

        this.initializeElements();
        this.attachEventListeners();
        this.loadSavedConfig();
    }

    initializeElements() {
        // Configuration elements
        this.agentUrlInput = document.getElementById('agentUrl');
        this.apiKeyInput = document.getElementById('apiKey');
        this.connectBtn = document.getElementById('connectBtn');
        this.statusDot = document.getElementById('statusDot');
        this.connectionStatus = document.getElementById('connectionStatus');

        // Main interface elements
        this.mainSection = document.getElementById('mainSection');
        this.documentTitleInput = document.getElementById('documentTitle');
        this.dropZone = document.getElementById('dropZone');
        this.fileInput = document.getElementById('fileInput');
        this.fileList = document.getElementById('fileList');
        this.fileItems = document.getElementById('fileItems');
        this.fileCount = document.getElementById('fileCount');
        this.clearFilesBtn = document.getElementById('clearFiles');
        this.downloadPdfCheckbox = document.getElementById('downloadPdf');
        this.generateBtn = document.getElementById('generateBtn');

        // Progress elements
        this.progressCard = document.getElementById('progressCard');
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');

        // Result elements
        this.resultCard = document.getElementById('resultCard');
        this.resultIcon = document.getElementById('resultIcon');
        this.resultTitle = document.getElementById('resultTitle');
        this.resultMessage = document.getElementById('resultMessage');
        this.resultActions = document.getElementById('resultActions');
    }

    attachEventListeners() {
        // Connection
        this.connectBtn.addEventListener('click', () => this.connect());

        // File upload
        this.dropZone.addEventListener('click', () => this.fileInput.click());
        this.dropZone.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.dropZone.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        this.dropZone.addEventListener('drop', (e) => this.handleDrop(e));
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

        // Clear files
        this.clearFilesBtn.addEventListener('click', () => this.clearFiles());

        // Generate PDF
        this.generateBtn.addEventListener('click', () => this.generatePDF());

        // Input validation
        this.documentTitleInput.addEventListener('input', () => this.validateForm());
    }

    loadSavedConfig() {
        this.agentUrlInput.value = this.agentUrl;
        this.apiKeyInput.value = this.apiKey;

        if (this.agentUrl && this.apiKey) {
            // Auto-connect if we have saved credentials
            this.connect();
        }
    }

    saveConfig() {
        this.agentUrl = this.agentUrlInput.value.trim();
        this.apiKey = this.apiKeyInput.value.trim();
        localStorage.setItem('agentUrl', this.agentUrl);
        localStorage.setItem('apiKey', this.apiKey);
    }

    updateStatus(status, message) {
        this.connectionStatus.textContent = message;
        this.statusDot.className = 'status-dot status-' + status;
        this.connected = (status === 'connected');

        if (this.connected) {
            this.mainSection.style.display = 'block';
            this.connectBtn.textContent = 'Connected ✓';
            this.connectBtn.disabled = true;
        } else {
            this.mainSection.style.display = 'none';
            this.connectBtn.textContent = 'Connect to Agent';
            this.connectBtn.disabled = false;
        }
    }

    connect() {
        this.saveConfig();

        if (!this.agentUrl || !this.apiKey) {
            alert('Please enter both Agent URL and API Key');
            return;
        }

        this.updateStatus('connecting', 'Connecting...');

        try {
            this.ws = new WebSocket(this.agentUrl);

            this.ws.onopen = () => {
                console.log('WebSocket connected, authenticating...');
                this.ws.send(JSON.stringify({
                    type: 'authenticate',
                    apiKey: this.apiKey
                }));
            };

            this.ws.onmessage = (event) => {
                this.handleMessage(JSON.parse(event.data));
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.updateStatus('error', 'Connection error');
            };

            this.ws.onclose = () => {
                console.log('WebSocket disconnected');
                this.updateStatus('disconnected', 'Disconnected');
            };

        } catch (error) {
            console.error('Connection error:', error);
            this.updateStatus('error', 'Failed to connect');
            alert('Failed to connect: ' + error.message);
        }
    }

    handleMessage(data) {
        console.log('Received:', data);

        switch (data.type) {
            case 'authenticated':
                if (data.success) {
                    this.updateStatus('connected', 'Connected');
                } else {
                    this.updateStatus('error', 'Authentication failed');
                    alert('Authentication failed: ' + (data.error || 'Invalid API key'));
                }
                break;

            case 'status':
                this.showProgress(data.message);
                break;

            case 'progress':
                this.updateProgress(data.progress);
                break;

            case 'completed':
                this.handleCompletion(data);
                break;

            case 'error':
                this.showError(data.error);
                break;
        }
    }

    handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        this.dropZone.classList.add('drag-over');
    }

    handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        this.dropZone.classList.remove('drag-over');
    }

    handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        this.dropZone.classList.remove('drag-over');

        const files = Array.from(e.dataTransfer.files);
        this.addFiles(files);
    }

    handleFileSelect(e) {
        const files = Array.from(e.target.files);
        this.addFiles(files);
        // Reset input so same file can be selected again
        e.target.value = '';
    }

    addFiles(newFiles) {
        const pngFiles = newFiles.filter(f => f.name.toLowerCase().endsWith('.png'));

        if (pngFiles.length === 0) {
            alert('Please select PNG files only');
            return;
        }

        // Validate filename format
        const invalidFiles = pngFiles.filter(f => !f.name.match(/^\d+_.*\.png$/i));
        if (invalidFiles.length > 0) {
            alert('Invalid filename format. Files must be named: {number}_*.png\n\nExamples:\n1_cover.png\n2_page-one.png');
            return;
        }

        // Add files that aren't already in the list
        pngFiles.forEach(file => {
            if (!this.files.some(f => f.name === file.name)) {
                this.files.push(file);
            }
        });

        this.renderFileList();
        this.validateForm();
    }

    renderFileList() {
        if (this.files.length === 0) {
            this.fileList.style.display = 'none';
            return;
        }

        // Sort files by page number
        this.files.sort((a, b) => {
            const numA = parseInt(a.name.match(/^(\d+)/)[1]);
            const numB = parseInt(b.name.match(/^(\d+)/)[1]);
            return numA - numB;
        });

        this.fileList.style.display = 'block';
        this.fileCount.textContent = this.files.length;

        this.fileItems.innerHTML = this.files.map((file, index) => {
            const pageNum = file.name.match(/^(\d+)/)[1];
            const sizeKB = (file.size / 1024).toFixed(1);

            return `
                <div class="file-item">
                    <div class="file-info">
                        <span class="file-page">Page ${pageNum}</span>
                        <span class="file-name">${file.name}</span>
                        <span class="file-size">${sizeKB} KB</span>
                    </div>
                    <button class="file-remove" onclick="client.removeFile(${index})">✕</button>
                </div>
            `;
        }).join('');
    }

    removeFile(index) {
        this.files.splice(index, 1);
        this.renderFileList();
        this.validateForm();
    }

    clearFiles() {
        this.files = [];
        this.renderFileList();
        this.validateForm();
    }

    validateForm() {
        const hasTitle = this.documentTitleInput.value.trim().length > 0;
        const hasFiles = this.files.length > 0;
        this.generateBtn.disabled = !(hasTitle && hasFiles);
    }

    async generatePDF() {
        const title = this.documentTitleInput.value.trim();
        const returnPdf = this.downloadPdfCheckbox.checked;

        if (!title || this.files.length === 0) {
            alert('Please enter a title and select files');
            return;
        }

        // Hide result card if visible
        this.resultCard.style.display = 'none';

        // Show progress
        this.progressCard.style.display = 'block';
        this.progressFill.style.width = '0%';
        this.progressText.textContent = 'Preparing files...';

        try {
            // Convert files to base64
            const filesData = await Promise.all(
                this.files.map(file => this.fileToBase64(file))
            );

            // Send to agent
            this.ws.send(JSON.stringify({
                type: 'process',
                title: title,
                files: filesData,
                returnPdf: returnPdf
            }));

        } catch (error) {
            console.error('Error:', error);
            this.showError('Failed to process files: ' + error.message);
        }
    }

    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                resolve({
                    name: file.name,
                    data: reader.result
                });
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    showProgress(message) {
        this.progressCard.style.display = 'block';
        this.progressText.textContent = message;
    }

    updateProgress(progress) {
        const percent = Math.round((progress.current / progress.total) * 100);
        this.progressFill.style.width = percent + '%';
        this.progressText.textContent = `Processing page ${progress.page}... (${progress.current}/${progress.total})`;
    }

    handleCompletion(data) {
        this.progressCard.style.display = 'none';

        this.resultIcon.innerHTML = '✓';
        this.resultIcon.className = 'result-icon success';
        this.resultTitle.textContent = 'PDF Generated Successfully!';
        this.resultMessage.textContent = `Saved to: ${data.savedPath}`;

        // Add download button if PDF data was returned
        if (data.pdfData) {
            this.resultActions.innerHTML = `
                <button class="btn btn-success" onclick="client.downloadPDF('${data.pdfData}')">
                    Download PDF
                </button>
                <button class="btn btn-secondary" onclick="client.resetForm()">
                    Create Another
                </button>
            `;
        } else {
            this.resultActions.innerHTML = `
                <button class="btn btn-primary" onclick="client.resetForm()">
                    Create Another PDF
                </button>
            `;
        }

        this.resultCard.style.display = 'block';
    }

    showError(error) {
        this.progressCard.style.display = 'none';

        this.resultIcon.innerHTML = '✕';
        this.resultIcon.className = 'result-icon error';
        this.resultTitle.textContent = 'Error';
        this.resultMessage.textContent = error;
        this.resultActions.innerHTML = `
            <button class="btn btn-primary" onclick="client.resultCard.style.display='none'">
                Close
            </button>
        `;

        this.resultCard.style.display = 'block';
    }

    downloadPDF(base64Data) {
        const blob = this.base64ToBlob(base64Data, 'application/pdf');
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'final_document.pdf';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    base64ToBlob(base64, mimeType) {
        const byteCharacters = atob(base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        return new Blob([byteArray], { type: mimeType });
    }

    resetForm() {
        this.clearFiles();
        this.documentTitleInput.value = '';
        this.resultCard.style.display = 'none';
        this.validateForm();
    }
}

// Initialize client
const client = new PaginatorClient();
