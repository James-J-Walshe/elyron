/**
 * Utility functions for rectangle detection
 */

class ImageProcessor {
    /**
     * Convert image data to grayscale
     * @param {ImageData} imageData - Canvas ImageData object
     * @returns {Uint8ClampedArray} Grayscale pixel array
     */
    static toGrayscale(imageData) {
        const { data, width, height } = imageData;
        const gray = new Uint8ClampedArray(width * height);
        
        for (let i = 0; i < data.length; i += 4) {
            // Use luminance formula for better grayscale conversion
            const luminance = Math.round(
                0.299 * data[i] +     // Red
                0.587 * data[i + 1] + // Green
                0.114 * data[i + 2]   // Blue
            );
            gray[i / 4] = luminance;
        }
        
        return gray;
    }

    /**
     * Apply Gaussian blur to reduce noise
     * @param {Uint8ClampedArray} gray - Grayscale image data
     * @param {number} width - Image width
     * @param {number} height - Image height
     * @param {number} radius - Blur radius (default: 1)
     * @returns {Uint8ClampedArray} Blurred image data
     */
    static gaussianBlur(gray, width, height, radius = 1) {
        const blurred = new Uint8ClampedArray(width * height);
        const kernel = this.generateGaussianKernel(radius);
        const kernelSize = kernel.length;
        const offset = Math.floor(kernelSize / 2);
        
        for (let y = offset; y < height - offset; y++) {
            for (let x = offset; x < width - offset; x++) {
                let sum = 0;
                let weightSum = 0;
                
                for (let ky = 0; ky < kernelSize; ky++) {
                    for (let kx = 0; kx < kernelSize; kx++) {
                        const pixelY = y + ky - offset;
                        const pixelX = x + kx - offset;
                        const weight = kernel[ky] * kernel[kx];
                        
                        sum += gray[pixelY * width + pixelX] * weight;
                        weightSum += weight;
                    }
                }
                
                blurred[y * width + x] = Math.round(sum / weightSum);
            }
        }
        
        return blurred;
    }

    /**
     * Generate 1D Gaussian kernel
     * @param {number} radius - Kernel radius
     * @returns {Array} Normalized Gaussian kernel
     */
    static generateGaussianKernel(radius) {
        const size = radius * 2 + 1;
        const kernel = new Array(size);
        const sigma = radius / 3;
        let sum = 0;
        
        for (let i = 0; i < size; i++) {
            const x = i - radius;
            kernel[i] = Math.exp(-(x * x) / (2 * sigma * sigma));
            sum += kernel[i];
        }
        
        // Normalize kernel
        for (let i = 0; i < size; i++) {
            kernel[i] /= sum;
        }
        
        return kernel;
    }

    /**
     * Sobel edge detection
     * @param {Uint8ClampedArray} gray - Grayscale image data
     * @param {number} width - Image width
     * @param {number} height - Image height
     * @param {number} threshold - Edge threshold
     * @returns {Uint8ClampedArray} Edge map
     */
    static sobelEdgeDetection(gray, width, height, threshold) {
        const edges = new Uint8ClampedArray(width * height);
        
        // Sobel kernels
        const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
        const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
        
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                let gx = 0, gy = 0;
                
                // Apply Sobel kernels
                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        const pixel = gray[(y + ky) * width + (x + kx)];
                        const kernelIndex = (ky + 1) * 3 + (kx + 1);
                        
                        gx += pixel * sobelX[kernelIndex];
                        gy += pixel * sobelY[kernelIndex];
                    }
                }
                
                // Calculate edge magnitude
                const magnitude = Math.sqrt(gx * gx + gy * gy);
                edges[y * width + x] = magnitude > threshold ? 255 : 0;
            }
        }
        
        return edges;
    }

    /**
     * Simple gradient-based edge detection (faster alternative to Sobel)
     * @param {Uint8ClampedArray} gray - Grayscale image data
     * @param {number} width - Image width
     * @param {number} height - Image height
     * @param {number} threshold - Edge threshold
     * @returns {Uint8ClampedArray} Edge map
     */
    static simpleEdgeDetection(gray, width, height, threshold) {
        const edges = new Uint8ClampedArray(width * height);
        
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                // Calculate gradients in x and y directions
                const gx = gray[y * width + (x + 1)] - gray[y * width + (x - 1)];
                const gy = gray[(y + 1) * width + x] - gray[(y - 1) * width + x];
                
                // Calculate edge magnitude
                const magnitude = Math.sqrt(gx * gx + gy * gy);
                edges[y * width + x] = magnitude > threshold ? 255 : 0;
            }
        }
        
        return edges;
    }
}

class GeometryUtils {
    /**
     * Calculate distance between two points
     * @param {Array} p1 - First point [x, y]
     * @param {Array} p2 - Second point [x, y]
     * @returns {number} Distance
     */
    static distance(p1, p2) {
        const dx = p1[0] - p2[0];
        const dy = p1[1] - p2[1];
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Calculate overlap ratio between two rectangles
     * @param {Object} rect1 - First rectangle {x, y, width, height}
     * @param {Object} rect2 - Second rectangle {x, y, width, height}
     * @returns {number} Overlap ratio (0-1)
     */
    static calculateOverlapRatio(rect1, rect2) {
        const x1 = Math.max(rect1.x, rect2.x);
        const y1 = Math.max(rect1.y, rect2.y);
        const x2 = Math.min(rect1.x + rect1.width, rect2.x + rect2.width);
        const y2 = Math.min(rect1.y + rect1.height, rect2.y + rect2.height);
        
        if (x2 <= x1 || y2 <= y1) return 0;
        
        const overlapArea = (x2 - x1) * (y2 - y1);
        const minArea = Math.min(rect1.width * rect1.height, rect2.width * rect2.height);
        
        return overlapArea / minArea;
    }

    /**
     * Check if a rectangle is valid based on aspect ratio and minimum area
     * @param {Object} rect - Rectangle {x, y, width, height, area}
     * @param {number} minArea - Minimum area threshold
     * @param {number} maxAspectRatio - Maximum aspect ratio
     * @returns {boolean} True if valid
     */
    static isValidRectangle(rect, minArea, maxAspectRatio) {
        if (!rect || rect.area < minArea) return false;
        
        const aspectRatio = rect.width / rect.height;
        return aspectRatio >= 1/maxAspectRatio && aspectRatio <= maxAspectRatio;
    }

    /**
     * Filter overlapping rectangles, keeping those with higher confidence
     * @param {Array} rectangles - Array of rectangle objects
     * @param {number} overlapThreshold - Overlap threshold (0-1)
     * @returns {Array} Filtered rectangles
     */
    static filterOverlappingRectangles(rectangles, overlapThreshold = 0.3) {
        const filtered = [];
        
        // Sort by confidence (descending)
        rectangles.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
        
        for (const rect of rectangles) {
            let isOverlapping = false;
            
            for (const existing of filtered) {
                const overlap = this.calculateOverlapRatio(rect, existing);
                if (overlap > overlapThreshold) {
                    isOverlapping = true;
                    break;
                }
            }
            
            if (!isOverlapping) {
                filtered.push(rect);
            }
        }
        
        return filtered;
    }
}

class CanvasUtils {
    /**
     * Calculate optimal image display size and position for canvas
     * @param {HTMLImageElement} image - Image element
     * @param {HTMLCanvasElement} canvas - Canvas element
     * @returns {Object} Scale and position info
     */
    static calculateImageScale(image, canvas) {
        const canvasRatio = canvas.width / canvas.height;
        const imageRatio = image.width / image.height;

        let drawWidth, drawHeight, drawX, drawY;

        if (imageRatio > canvasRatio) {
            // Image is wider than canvas ratio
            drawWidth = canvas.width;
            drawHeight = canvas.width / imageRatio;
            drawX = 0;
            drawY = (canvas.height - drawHeight) / 2;
        } else {
            // Image is taller than canvas ratio
            drawWidth = canvas.height * imageRatio;
            drawHeight = canvas.height;
            drawX = (canvas.width - drawWidth) / 2;
            drawY = 0;
        }

        return {
            scaleX: drawWidth / image.width,
            scaleY: drawHeight / image.height,
            offsetX: drawX,
            offsetY: drawY,
            drawWidth,
            drawHeight
        };
    }

    /**
     * Convert rectangle coordinates from image space to canvas space
     * @param {Object} rect - Rectangle in image coordinates
     * @param {Object} scale - Scale information from calculateImageScale
     * @returns {Object} Rectangle in canvas coordinates
     */
    static rectToCanvasCoords(rect, scale) {
        return {
            x: rect.x * scale.scaleX + scale.offsetX,
            y: rect.y * scale.scaleY + scale.offsetY,
            width: rect.width * scale.scaleX,
            height: rect.height * scale.scaleY
        };
    }

    /**
     * Draw a rectangle with styling on canvas
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} rect - Rectangle to draw
     * @param {Object} options - Drawing options
     */
    static drawStyledRectangle(ctx, rect, options = {}) {
        const {
            strokeColor = '#48bb78',
            fillColor = 'rgba(72, 187, 120, 0.1)',
            lineWidth = 2,
            cornerSize = 6,
            showCorners = true,
            showLabel = true,
            label = ''
        } = options;

        // Draw filled rectangle
        if (fillColor) {
            ctx.fillStyle = fillColor;
            ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
        }

        // Draw rectangle outline
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = lineWidth;
        // Draw rectangle outline
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = lineWidth;
        ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);

        // Draw corner markers
        if (showCorners) {
            ctx.fillStyle = strokeColor;
            const corners = [
                [rect.x, rect.y],
                [rect.x + rect.width, rect.y],
                [rect.x + rect.width, rect.y + rect.height],
                [rect.x, rect.y + rect.height]
            ];
            
            corners.forEach(([x, y]) => {
                ctx.beginPath();
                ctx.arc(x, y, cornerSize, 0, 2 * Math.PI);
                ctx.fill();
            });
        }

        // Draw label
        if (showLabel && label) {
            ctx.font = '12px Arial';
            const textWidth = ctx.measureText(label).width;
            
            // Background for text
            ctx.fillStyle = strokeColor;
            ctx.fillRect(rect.x, rect.y - 20, textWidth + 10, 18);
            
            // Text
            ctx.fillStyle = 'white';
            ctx.textAlign = 'left';
            ctx.fillText(label, rect.x + 5, rect.y - 6);
        }
    }
}

class StatusManager {
    /**
     * Show status message to user
     * @param {string} message - Message to display
     * @param {string} type - Message type ('success', 'error', 'info')
     * @param {number} duration - Display duration in ms
     */
    static showStatus(message, type = 'success', duration = 3000) {
        const statusEl = document.getElementById('statusMessage');
        if (!statusEl) return;
        
        statusEl.textContent = message;
        statusEl.className = `status-message ${type}`;
        statusEl.style.display = 'block';
        
        // Auto-hide after duration
        setTimeout(() => {
            statusEl.style.display = 'none';
        }, duration);
    }

    /**
     * Update parameter display values
     */
    static updateParameterDisplays() {
        const parameters = [
            { id: 'sensitivity', valueId: 'sensitivityValue' },
            { id: 'minArea', valueId: 'minAreaValue' },
            { id: 'aspectRatio', valueId: 'aspectRatioValue' }
        ];

        parameters.forEach(param => {
            const element = document.getElementById(param.id);
            const valueElement = document.getElementById(param.valueId);
            
            if (element && valueElement) {
                valueElement.textContent = element.value;
            }
        });
    }

    /**
     * Toggle button enabled/disabled state
     * @param {string} buttonId - Button element ID
     * @param {boolean} enabled - Whether button should be enabled
     */
    static toggleButton(buttonId, enabled) {
        const button = document.getElementById(buttonId);
        if (button) {
            button.disabled = !enabled;
        }
    }

    /**
     * Show/hide loading state on an element
     * @param {string} elementId - Element ID
     * @param {boolean} loading - Whether to show loading state
     */
    static setLoadingState(elementId, loading) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        if (loading) {
            element.classList.add('processing');
        } else {
            element.classList.remove('processing');
        }
    }
}

class ValidationUtils {
    /**
     * Validate uploaded file
     * @param {File} file - File to validate
     * @returns {Object} Validation result {valid: boolean, error?: string}
     */
    static validateImageFile(file) {
        if (!file) {
            return { valid: false, error: 'No file selected' };
        }
        
        if (!file.type.startsWith('image/')) {
            return { valid: false, error: 'Please select a valid image file' };
        }
        
        // Check file size (max 10MB)
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            return { valid: false, error: 'Image file is too large (max 10MB)' };
        }
        
        // Check supported formats
        const supportedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!supportedTypes.includes(file.type)) {
            return { valid: false, error: 'Unsupported image format. Please use JPEG, PNG, GIF, or WebP' };
        }
        
        return { valid: true };
    }

    /**
     * Validate detection parameters
     * @param {Object} params - Parameters to validate
     * @returns {Object} Validation result
     */
    static validateDetectionParams(params) {
        const { sensitivity, minArea, aspectRatio } = params;
        
        if (sensitivity < 10 || sensitivity > 300) {
            return { valid: false, error: 'Sensitivity must be between 10 and 300' };
        }
        
        if (minArea < 100 || minArea > 50000) {
            return { valid: false, error: 'Minimum area must be between 100 and 50,000 pixels' };
        }
        
        if (aspectRatio < 1 || aspectRatio > 20) {
            return { valid: false, error: 'Aspect ratio must be between 1 and 20' };
        }
        
        return { valid: true };
    }
}

// Export utilities for use in other modules (if using ES6 modules)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ImageProcessor,
        GeometryUtils,
        CanvasUtils,
        StatusManager,
        ValidationUtils
    };
}
