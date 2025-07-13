const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;

class ImageService {
  constructor() {
    this.uploadDir = path.join(__dirname, '../../uploads');
    this.optimizedDir = path.join(__dirname, '../../uploads/optimized');
    this.ensureDirectories();
  }

  async ensureDirectories() {
    const dirs = [
      this.uploadDir,
      this.optimizedDir,
      path.join(this.optimizedDir, 'products'),
      path.join(this.optimizedDir, 'avatars'),
      path.join(this.optimizedDir, 'thumbnails'),
      path.join(this.optimizedDir, 'banners')
    ];

    for (const dir of dirs) {
      try {
        await fs.mkdir(dir, { recursive: true });
      } catch (error) {
        console.error(`Error creating directory ${dir}:`, error);
      }
    }
  }

  async optimizeImage(inputPath, outputPath, options = {}) {
    const {
      width = 800,
      height = 600,
      quality = 80,
      format = 'webp',
      fit = 'inside',
      background = { r: 255, g: 255, b: 255, alpha: 1 }
    } = options;

    try {
      const image = sharp(inputPath);
      
      // Get image metadata
      const metadata = await image.metadata();
      
      // Resize image
      const resized = image.resize(width, height, {
        fit,
        withoutEnlargement: true,
        background
      });

      let optimized;
      
      // Convert to specified format with quality settings
      switch (format.toLowerCase()) {
        case 'webp':
          optimized = resized.webp({ quality });
          break;
        case 'jpeg':
        case 'jpg':
          optimized = resized.jpeg({ quality });
          break;
        case 'png':
          optimized = resized.png({ quality });
          break;
        case 'avif':
          optimized = resized.avif({ quality });
          break;
        default:
          optimized = resized.webp({ quality });
      }

      // Save optimized image
      await optimized.toFile(outputPath);

      // Get file sizes
      const originalSize = (await fs.stat(inputPath)).size;
      const optimizedSize = (await fs.stat(outputPath)).size;
      const compressionRatio = ((originalSize - optimizedSize) / originalSize) * 100;

      return {
        originalSize,
        optimizedSize,
        compressionRatio: Math.round(compressionRatio * 100) / 100,
        format,
        width,
        height,
        originalFormat: metadata.format,
        originalWidth: metadata.width,
        originalHeight: metadata.height
      };
    } catch (error) {
      console.error('Image optimization error:', error);
      throw error;
    }
  }

  async generateThumbnail(inputPath, outputPath, size = 200) {
    return this.optimizeImage(inputPath, outputPath, {
      width: size,
      height: size,
      quality: 70,
      format: 'webp',
      fit: 'cover'
    });
  }

  async optimizeProductImages(originalPath, productId) {
    const filename = path.basename(originalPath, path.extname(originalPath));
    
    // Generate different sizes for responsive design
    const sizes = [
      { name: 'thumbnail', width: 150, height: 150, quality: 70 },
      { name: 'small', width: 300, height: 300, quality: 75 },
      { name: 'medium', width: 600, height: 600, quality: 80 },
      { name: 'large', width: 1200, height: 1200, quality: 85 },
      { name: 'xl', width: 1920, height: 1920, quality: 90 }
    ];

    const optimizedImages = {};

    for (const size of sizes) {
      const outputPath = path.join(
        this.optimizedDir,
        'products',
        `${filename}_${size.name}.webp`
      );

      try {
        const result = await this.optimizeImage(originalPath, outputPath, {
          width: size.width,
          height: size.height,
          quality: size.quality,
          format: 'webp'
        });

        optimizedImages[size.name] = {
          path: outputPath,
          url: `/uploads/optimized/products/${path.basename(outputPath)}`,
          ...result
        };
      } catch (error) {
        console.error(`Error optimizing ${size.name} image:`, error);
      }
    }

    return optimizedImages;
  }

  async optimizeAvatar(inputPath, userId) {
    const filename = `avatar_${userId}`;
    const outputPath = path.join(this.optimizedDir, 'avatars', `${filename}.webp`);
    
    return this.optimizeImage(inputPath, outputPath, {
      width: 200,
      height: 200,
      quality: 80,
      format: 'webp',
      fit: 'cover'
    });
  }

  async optimizeBanner(inputPath, bannerId) {
    const filename = `banner_${bannerId}`;
    const outputPath = path.join(this.optimizedDir, 'banners', `${filename}.webp`);
    
    return this.optimizeImage(inputPath, outputPath, {
      width: 1920,
      height: 600,
      quality: 85,
      format: 'webp',
      fit: 'cover'
    });
  }

  async deleteOptimizedImages(imagePath) {
    try {
      const filename = path.basename(imagePath, path.extname(imagePath));
      const optimizedDirs = [
        path.join(this.optimizedDir, 'products'),
        path.join(this.optimizedDir, 'avatars'),
        path.join(this.optimizedDir, 'banners')
      ];
      
      for (const dir of optimizedDirs) {
        try {
          const files = await fs.readdir(dir);
          const matchingFiles = files.filter(file => file.startsWith(filename));
          
          for (const file of matchingFiles) {
            await fs.unlink(path.join(dir, file));
            console.log(`🗑️  Deleted optimized image: ${file}`);
          }
        } catch (error) {
          console.error(`Error cleaning up directory ${dir}:`, error);
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error deleting optimized images:', error);
      return false;
    }
  }

  async getImageInfo(imagePath) {
    try {
      const metadata = await sharp(imagePath).metadata();
      const stats = await fs.stat(imagePath);
      
      return {
        format: metadata.format,
        width: metadata.width,
        height: metadata.height,
        size: stats.size,
        hasAlpha: metadata.hasAlpha,
        hasProfile: metadata.hasProfile,
        space: metadata.space,
        channels: metadata.channels,
        depth: metadata.depth,
        density: metadata.density,
        orientation: metadata.orientation
      };
    } catch (error) {
      console.error('Error getting image info:', error);
      throw error;
    }
  }

  async createImageVariants(inputPath, variants) {
    const results = {};
    
    for (const [name, config] of Object.entries(variants)) {
      const outputPath = path.join(
        this.optimizedDir,
        `${name}_${Date.now()}.webp`
      );
      
      try {
        const result = await this.optimizeImage(inputPath, outputPath, config);
        results[name] = {
          path: outputPath,
          url: `/uploads/optimized/${path.basename(outputPath)}`,
          ...result
        };
      } catch (error) {
        console.error(`Error creating variant ${name}:`, error);
      }
    }
    
    return results;
  }

  // Batch processing
  async processBatch(images, options = {}) {
    const results = [];
    
    for (const image of images) {
      try {
        const result = await this.optimizeImage(
          image.inputPath,
          image.outputPath,
          { ...options, ...image.options }
        );
        results.push({ success: true, image: image.name, result });
      } catch (error) {
        results.push({ success: false, image: image.name, error: error.message });
      }
    }
    
    return results;
  }
}

module.exports = new ImageService(); 