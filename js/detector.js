/**
 * Main rectangle detection class
 */
class RectangleDetector {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.image = null;
        this.rectangles = [];
        this.imageScale = null;
        this.isProcessing = false;
        
        this.init();
    }

    /**
     * Initialize the detector
     */
    init() {
        this.setupCanvas();
        this.setupEventListeners();
        StatusManager.updateParameterDisplays();
        console.log('Rectangle Detector initialized');
    }

    /**
     * Setup canvas with initial state
     */
    setupCanvas() {
        this.canvas.width = 800;
        this.canvas.height = 600;
        this.clearCanvas();
    }

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        // File input
        const fileInput = document.getElementById('fileInput');
        fileInput.addEventListener('change', (e) => {
            if (e.target.files[0]) {
                this.loadImage(e.target.files[0]);
            }
        });

        // Drag and drop
        this.setupDragAndDrop();

        // Control buttons
        document.getElementById('detectBtn').addEventListener('click', () => {
            this.detectRectangles();
        });

        document.getElementById('clearBtn').addEventListener('click', () => {
            this.clear();
        });

        // Parameter sliders
        const sliders = ['sensitivity', 'minArea', 'aspectRatio'];
        sliders.forEach(sliderId => {
            document.getElementById(sliderId).addEventListener('input', () => {
                StatusManager.updateParameterDisplays();
            });
        });
    }

    /**
     * Setup drag and drop functionality
     */
    setupDragAndDrop() {
        const uploadSection = document.getElementById('uploadSection');
        
        uploadSection.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadSection.classList.add('dragover');
        });

        uploadSection.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadSection.classList.remove('dragover');
        });

        uploadSection.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadSection.classList.remove('dragover');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.loadImage(files[0]);
            }
        });
    }

    /**
     * Load and validate image file
     * @param {File} file - Image file to load
     */
    loadImage(file) {
        console.log('Loading image:', file.name);
        
        // Validate file
        const validation = ValidationUtils.validateImageFile(file);
        if (!validation.valid) {
            StatusManager.showStatus(validation.error, 'error');
            return;
        }

        StatusManager.showStatus(`Loading ${file.name}...`, 'info', 1000);
        StatusManager.setLoadingState('uploadSection', true);

        const reader = new FileReader();
        
        reader.onload = (e) => {
            const img = new Image();
            
            img.onload = () => {
                this.image = img;
                this.displayImage();
                this.enableControls();
                this.hideResults();
                
                StatusManager.showStatus(`Image loaded: ${file.name}`, 'success');
                StatusManager.setLoadingState('uploadSection', false);
                
                console.log(`Image loaded: ${img.width}x${img.height}`);
            };
            
            img.onerror = () => {
                StatusManager.showStatus('Failed to load image. Please try another file.', 'error');
                StatusManager.setLoadingState('uploadSection', false);
                console.error('Image load error');
            };
            
            img.src = e.target.result;
        };
        
        reader.onerror = () => {
            StatusManager.showStatus('Failed to read file. Please try again.', 'error');
            StatusManager.setLoadingState('uploadSection', false);
            console.error('File reader error');
        };
        
        reader.readAsDataURL(file);
    }

    /**
     * Display image on canvas
     */
    displayImage() {
        if (!this.image) return;

        // Calculate optimal display size
        this.imageScale = CanvasUtils.calculateImageScale(this.image, this.canvas);
        
        // Clear and draw background
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = '#f8fafc';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw image
        this.ctx.drawImage(
            this.image,
            this.imageScale.offsetX,
            this.imageScale.offsetY,
            this.imageScale.drawWidth,
            this.imageScale.drawHeight
        );
        
        console.log('Image displayed with scale:', this.imageScale);
    }

    /**
     * Enable control buttons
     */
    enableControls() {
        StatusManager.toggleButton('detectBtn', true);
        StatusManager.toggleButton('clearBtn', true);
    }

    /**
     * Disable control buttons
     */
    disableControls() {
        StatusManager.toggleButton('detectBtn', false);
        StatusManager.toggleButton('clearBtn', false);
    }

    /**
     * Main rectangle detection method
     */
    async detectRectangles() {
        if (!this.image || this.isProcessing) return;

        console.log('Starting rectangle detection...');
        this.isProcessing = true;
        
        const startTime = performance.now();
        
        try {
            // Get parameters
            const params = this.getDetectionParameters();
            console.log('Detection parameters:', params);
            
            // Validate parameters
            const validation = ValidationUtils.validateDetectionParams(params);
            if (!validation.valid) {
                StatusManager.showStatus(validation.error, 'error');
                return;
            }

            // Show processing state
            StatusManager.showStatus('Detecting rectangles...', 'info', 1000);
            StatusManager.setLoadingState('canvas', true);

            // Perform detection
            this.rectangles = await this.performDetection(params);
            
            const processingTime = Math.round(performance.now() - startTime);
            console.log(`Detection completed in ${processingTime}ms, found ${this.rectangles.length} rectangles`);
            
            // Visualize results
            this.visualizeResults();
            this.showResults(processingTime);
            
            if (this.rectangles.length > 0) {
                StatusManager.showStatus(`Found ${this.rectangles.length} rectangles in ${processingTime}ms`, 'success');
            } else {
                StatusManager.showStatus('No rectangles detected. Try adjusting parameters.', 'info');
            }
            
        } catch (error) {
            console.error('Detection error:', error);
            StatusManager.showStatus('Error during detection. Please try again.', 'error');
        } finally {
            this.isProcessing = false;
            StatusManager.setLoadingState('canvas', false);
        }
    }

    /**
     * Get detection parameters from UI
     * @returns {Object} Detection parameters
     */
    getDetectionParameters() {
        return {
            sensitivity: parseInt(document.getElementById('sensitivity').value),
            minArea: parseInt(document.getElementById('minArea').value),
            aspectRatio: parseFloat(document.getElementById('aspectRatio').value)
        };
    }

    /**
     * Perform the actual rectangle detection
     * @param {Object} params - Detection parameters
     * @returns {Promise<Array>} Array of detected rectangles
     */
    async performDetection(params) {
        return new Promise((resolve) => {
            // Use setTimeout to prevent UI blocking
            setTimeout(() => {
                try {
                    const rectangles = this.detectRectanglesInImage(params);
                    resolve(rectangles);
                } catch (error) {
                    console.error('Detection processing error:', error);
                    resolve([]);
                }
            }, 100);
        });
    }

    /**
     * Core rectangle detection algorithm
     * @param {Object} params - Detection parameters
     * @returns {Array} Array of detected rectangles
     */
    detectRectanglesInImage(params) {
        // Create temporary canvas for processing
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = this.image.width;
        tempCanvas.height = this.image.height;
        
        // Draw image to temporary canvas
        tempCtx.drawImage(this.image, 0, 0);
        
        // Get image data
        const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        console.log(`Processing image data: ${imageData.width}x${imageData.height}`);
        
        // Convert to grayscale
        const gray = ImageProcessor.toGrayscale(imageData);
        
        // Apply slight blur to reduce noise
        const blurred = ImageProcessor.gaussianBlur(gray, imageData.width, imageData.height, 1);
        
        // Detect edges
        const edges = ImageProcessor.simpleEdgeDetection(
            blurred, 
            imageData.width, 
            imageData.height, 
            params.sensitivity
        );
        
        // Find rectangles from edges using simplified algorithm
        const rectangles = this.findRectanglesFromEdges(
            edges,
            imageData.width,
            imageData.height,
            params.minArea,
            params.aspectRatio
        );
        
        console.log(`Found ${rectangles.length} raw rectangles before filtering`);
        
        // Filter overlapping rectangles
        const filtered = GeometryUtils.filterOverlappingRectangles(rectangles, 0.3);
        
        console.log(`${filtered.length} rectangles after overlap filtering`);
        
        return filtered.slice(0, 10); // Limit to top 10 results
    }

    /**
     * Simplified rectangle detection - looks for edge-dense rectangular regions
     * @param {Uint8ClampedArray} edges - Edge map
     * @param {number} width - Image width
     * @param {number} height - Image height
     * @param {number} minArea - Minimum area threshold
     * @param {number} maxAspectRatio - Maximum aspect ratio
     * @returns {Array} Array of rectangle candidates
     */
    findRectanglesFromEdges(edges, width, height, minArea, maxAspectRatio) {
        const rectangles = [];
        const visited = new Uint8ClampedArray(width * height);
        
        // Much simpler approach - look for edge-dense rectangular regions
        const stepSize = 15;
        
        for (let y = 10; y < height - 50; y += stepSize) {
            for (let x = 10; x < width - 50; x += stepSize) {
                if (visited[y * width + x]) continue;
                
                // Try different rectangle sizes at this position
                for (let w = 40; w < Math.min(300, width - x); w += 20) {
                    for (let h = 30; h < Math.min(200, height - y); h += 15) {
                        const area = w * h;
                        if (area < minArea) continue;
                        
                        const aspectRatio = Math.max(w, h) / Math.min(w, h);
                        if (aspectRatio > maxAspectRatio) continue;
                        
                        // Count total edges in this rectangle
                        let edgeCount = 0;
                        let totalPixels = 0;
                        
                        for (let dy = 0; dy < h; dy++) {
                            for (let dx = 0; dx < w; dx++) {
                                if (y + dy < height && x + dx < width) {
                                    totalPixels++;
                                    if (edges[(y + dy) * width + (x + dx)]) {
                                        edgeCount++;
                                    }
                                }
                            }
                        }
                        
                        const edgeRatio = edgeCount / totalPixels;
                        
                        // If this region has a reasonable amount of edges, consider it a rectangle
                        if (edgeRatio > 0.1 && edgeRatio < 0.8) { // 10-80% edges
                            // Mark as visited
                            for (let dy = 0; dy < h; dy += 5) {
                                for (let dx = 0; dx < w; dx += 5) {
                                    if (y + dy < height && x + dx < width) {
                                        visited[(y + dy) * width + (x + dx)] = 1;
                                    }
                                }
                            }
                            
                            rectangles.push(this.createRectangleObject({
                                x: x,
                                y: y,
                                width: w,
                                height: h,
                                area: area,
                                confidence: Math.min(0.95, edgeRatio * 2)
                            }, rectangles.length));
                            
                            if (rectangles.length >= 10) return rectangles;
                            break; // Found one at this position, move on
                        }
                    }
                    if (rectangles.length >= 10) break;
                }
            }
        }
        
        console.log(`Simple detection found ${rectangles.length} rectangles`);
        return rectangles;
    }

    /**
     * Create a formatted rectangle object
     * @param {Object} rect - Raw rectangle data
     * @param {number} index - Rectangle index
     * @returns {Object} Formatted rectangle object
     */
    createRectangleObject(rect, index) {
        const aspectRatio = Math.round((rect.width / rect.height) * 100) / 100;
        
        return {
            id: `RECT-${index + 1}`,
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
            area: rect.area,
            aspectRatio: aspectRatio,
            confidence: rect.confidence,
            center: {
                x: Math.round(rect.x + rect.width / 2),
                y: Math.round(rect.y + rect.height / 2)
            }
        };
    }

    /**
     * Visualize detection results on canvas
     */
    visualizeResults() {
        if (!this.image || !this.imageScale) return;
        
        // Redraw base image
        this.displayImage();
        
        // Draw each rectangle
        this.rectangles.forEach((rect, index) => {
            const canvasRect = CanvasUtils.rectToCanvasCoords(rect, this.imageScale);
            
            // Color based on confidence and index
            const hue = 120 + (index * 35) % 240;
            const alpha = 0.4 + (rect.confidence * 0.6);
            const strokeColor = `hsla(${hue}, 70%, 50%, ${alpha})`;
            const fillColor = `hsla(${hue}, 70%, 50%, 0.15)`;
            
            // Draw styled rectangle
            CanvasUtils.drawStyledRectangle(this.ctx, canvasRect, {
                strokeColor: strokeColor,
                fillColor: fillColor,
                lineWidth: Math.max(2, rect.confidence * 4),
                cornerSize: 5,
                showLabel: true,
                label: `${rect.id} (${Math.round(rect.confidence * 100)}%)`
            });
        });
        
        console.log(`Visualized ${this.rectangles.length} rectangles`);
    }

    /**
     * Show detection results in UI
     * @param {number} processingTime - Processing time in ms
     */
    showResults(processingTime) {
        const count = this.rectangles.length;
        
        // Update statistics
        document.getElementById('countStat').textContent = count;
        document.getElementById('timeStat').textContent = processingTime;
        
        if (count > 0) {
            const avgArea = Math.round(
                this.rectangles.reduce((sum, r) => sum + r.area, 0) / count
            );
            document.getElementById('avgAreaStat').textContent = avgArea.toLocaleString();
            
            this.displayRectangleList();
        } else {
            document.getElementById('avgAreaStat').textContent = '0';
            this.displayNoResultsMessage();
        }
        
        // Show results section
        document.getElementById('results').style.display = 'block';
    }

    /**
     * Display list of detected rectangles
     */
    displayRectangleList() {
        const listEl = document.getElementById('rectangleList');
        listEl.innerHTML = '<h4 style="margin-bottom: 15px; color: #2d3748;">Detected Rectangles</h4>';
        
        this.rectangles.forEach((rect, index) => {
            const item = document.createElement('div');
            item.className = 'rectangle-item';
            
            item.innerHTML = `
                <div class="rectangle-info">
                    <div class="rectangle-id">${rect.id}</div>
                    <div class="rectangle-details">
                        Position: (${rect.x}, ${rect.y}) • Size: ${rect.width}×${rect.height}<br>
                        Area: ${rect.area.toLocaleString()} pixels • Aspect: ${rect.aspectRatio} • Confidence: ${Math.round(rect.confidence * 100)}%
                    </div>
                </div>
                <button class="highlight-btn" onclick="detector.highlightRectangle(${index})">
                    Highlight
                </button>
            `;
            
            listEl.appendChild(item);
        });
    }

    /**
     * Display message when no rectangles are found
     */
    displayNoResultsMessage() {
        const listEl = document.getElementById('rectangleList');
        listEl.innerHTML = `
            <h4 style="margin-bottom: 15px; color: #2d3748;">No Rectangles Detected</h4>
            <div style="color: #718096; line-height: 1.6;">
                <p style="margin-bottom: 10px;"><strong>Try adjusting these parameters:</strong></p>
                <ul style="margin-left: 20px; margin-bottom: 15px;">
                    <li><strong>Edge Sensitivity:</strong> Lower values detect stronger edges only</li>
                    <li><strong>Minimum Area:</strong> Reduce to find smaller rectangles</li>
                    <li><strong>Aspect Ratio:</strong> Increase to allow more elongated shapes</li>
                </ul>
                <p><strong>Best results with:</strong> High-contrast images, clear rectangular outlines, simple backgrounds</p>
            </div>
        `;
    }

    /**
     * Highlight a specific rectangle
     * @param {number} index - Rectangle index to highlight
     */
    highlightRectangle(index) {
        const rect = this.rectangles[index];
        if (!rect) return;
        
        console.log('Highlighting rectangle:', rect.id);
        
        // Redraw all rectangles
        this.visualizeResults();
        
        // Draw highlight
        const canvasRect = CanvasUtils.rectToCanvasCoords(rect, this.imageScale);
        
        // Animated highlight border
        this.ctx.strokeStyle = '#ff4757';
        this.ctx.lineWidth = 4;
        this.ctx.setLineDash([10, 5]);
        this.ctx.strokeRect(
            canvasRect.x - 4, 
            canvasRect.y - 4, 
            canvasRect.width + 8, 
            canvasRect.height + 8
        );
        this.ctx.setLineDash([]);
        
        // Highlight center
        this.ctx.fillStyle = '#ff4757';
        this.ctx.beginPath();
        this.ctx.arc(
            canvasRect.x + canvasRect.width / 2,
            canvasRect.y + canvasRect.height / 2,
            8, 0, 2 * Math.PI
        );
        this.ctx.fill();
        
        // Highlight label
        this.ctx.fillStyle = '#ff4757';
        this.ctx.font = 'bold 14px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(
            'SELECTED',
            canvasRect.x + canvasRect.width / 2,
            canvasRect.y - 15
        );
    }

    /**
     * Hide results section
     */
    hideResults() {
        document.getElementById('results').style.display = 'none';
    }

    /**
     * Clear canvas with placeholder text
     */
    clearCanvas() {
        this.ctx.fillStyle = '#f8fafc';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.fillStyle = '#a0aec0';
        this.ctx.font = '18px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(
            'Upload an image to begin rectangle detection',
            this.canvas.width / 2,
            this.canvas.height / 2
        );
    }

    /**
     * Clear all data and reset to initial state
     */
    clear() {
        console.log('Clearing detector state');
        
        this.image = null;
        this.rectangles = [];
        this.imageScale = null;
        
        // Reset file input
        document.getElementById('fileInput').value = '';
        
        // Disable controls
        this.disableControls();
        
        // Clear canvas
        this.clearCanvas();
        
        // Hide results
        this.hideResults();
        
        // Clear status
        const statusEl = document.getElementById('statusMessage');
        if (statusEl) {
            statusEl.style.display = 'none';
        }
        
        StatusManager.showStatus('Cleared all data', 'info', 1500);
    }
}

// Initialize detector when DOM is loaded
let detector;
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing Rectangle Detector...');
    detector = new RectangleDetector();
    
    // Make detector globally available for button callbacks
    window.detector = detector;
});
