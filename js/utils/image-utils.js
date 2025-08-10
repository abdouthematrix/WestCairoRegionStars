export class ImageUtils {
    static async fileToBase64(file) {
        return new Promise((resolve, reject) => {
            if (!file) {
                resolve(null);
                return;
            }

            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    static async resizeImage(file, maxWidth = 300, maxHeight = 300, quality = 0.8) {
        return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();

            img.onload = () => {
                // Calculate new dimensions
                let { width, height } = img;

                if (width > height) {
                    if (width > maxWidth) {
                        height = height * (maxWidth / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = width * (maxHeight / height);
                        height = maxHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                // Draw and compress
                ctx.drawImage(img, 0, 0, width, height);
                const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
                resolve(compressedBase64);
            };

            img.onerror = reject;
            img.src = URL.createObjectURL(file);
        });
    }

    static createImagePreview(base64Data, className = 'image-preview') {
        if (!base64Data) return null;

        const img = document.createElement('img');
        img.src = base64Data;
        img.className = className;
        img.style.display = 'block';
        return img;
    }

    static setupImageUpload(inputId, previewId, callback) {
        const input = document.getElementById(inputId);
        const preview = document.getElementById(previewId);

        if (!input) return;

        input.addEventListener('change', async (event) => {
            const file = event.target.files[0];

            if (file) {
                try {
                    // Validate file type
                    if (!file.type.startsWith('image/')) {
                        throw new Error('Please select an image file');
                    }

                    // Validate file size (max 5MB)
                    if (file.size > 5 * 1024 * 1024) {
                        throw new Error('Image size should be less than 5MB');
                    }

                    // Resize and convert to base64
                    const base64 = await this.resizeImage(file);

                    // Update preview
                    if (preview) {
                        preview.src = base64;
                        preview.classList.add('show');
                    }

                    // Call callback with base64 data
                    if (callback) {
                        callback(base64);
                    }
                } catch (error) {
                    console.error('Error processing image:', error);
                    alert(error.message);
                    input.value = '';
                    if (preview) {
                        preview.classList.remove('show');
                    }
                }
            } else {
                if (preview) {
                    preview.classList.remove('show');
                }
                if (callback) {
                    callback(null);
                }
            }
        });
    }

    static getDefaultAvatar(name) {
        // Create a simple avatar with initials
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const size = 100;

        canvas.width = size;
        canvas.height = size;

        // Background circle
        const colors = ['#3182ce', '#38a169', '#d69e2e', '#e53e3e', '#805ad5'];
        const color = colors[name.length % colors.length];

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2, 0, 2 * Math.PI);
        ctx.fill();

        // Text (initials)
        const initials = name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 40px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(initials, size / 2, size / 2);

        return canvas.toDataURL('image/png');
    }
}