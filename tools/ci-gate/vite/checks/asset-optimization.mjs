/**
 * Asset Optimization Check
 * =========================
 * Validates asset handling and optimization settings.
 * 
 * Validates:
 *  - assetsInlineLimit for CSP compatibility
 *  - Asset file naming patterns
 *  - Static asset organization
 *  - Image optimization plugins
 *  - Public directory structure
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const WORKSPACE_ROOT = join(import.meta.dirname, "../../../..");
const WEB_APP = join(WORKSPACE_ROOT, "apps/web");
const VITE_CONFIG = join(WEB_APP, "vite.config.ts");
const PUBLIC_DIR = join(WEB_APP, "public");

// Asset size thresholds (bytes)
const THRESHOLDS = {
  imageSize: 500 * 1024,        // 500KB per image
  fontSize: 200 * 1024,         // 200KB per font
  publicDirSize: 5 * 1024 * 1024, // 5MB total public directory
};

/**
 * Check assetsInlineLimit configuration
 */
function checkAssetsInlineLimit() {
  const warnings = [];
  
  if (!existsSync(VITE_CONFIG)) {
    return { errors: [], warnings: [] };
  }
  
  const content = readFileSync(VITE_CONFIG, "utf-8");
  
  // Check for assetsInlineLimit
  const inlineLimitMatch = content.match(/assetsInlineLimit:\s*(\d+)/);
  
  if (!inlineLimitMatch) {
    warnings.push({
      message: "assetsInlineLimit not explicitly configured",
      file: "apps/web/vite.config.ts",
      suggestion: "Set assetsInlineLimit: 0 if using strict CSP (disables data URIs), or keep default 4096 for optimal performance"
    });
  } else {
    const limit = parseInt(inlineLimitMatch[1], 10);
    
    // If CSP is mentioned in config but inline limit is not 0
    if (content.includes("CSP") && limit !== 0) {
      warnings.push({
        message: `assetsInlineLimit is ${limit} but CSP is mentioned`,
        file: "apps/web/vite.config.ts",
        suggestion: "For strict CSP without 'unsafe-inline', set assetsInlineLimit: 0 to prevent data URIs"
      });
    }
    
    // If limit is too high
    if (limit > 10240) {
      warnings.push({
        message: `assetsInlineLimit is very high (${limit} bytes)`,
        file: "apps/web/vite.config.ts",
        suggestion: "Large inline limits increase HTML size. Consider reducing to 4096 (4KB) or less."
      });
    }
  }
  
  return { errors: [], warnings };
}

/**
 * Check public directory structure
 */
function checkPublicDirectory() {
  const warnings = [];
  
  if (!existsSync(PUBLIC_DIR)) {
    warnings.push({
      message: "public/ directory not found",
      file: "apps/web/public",
      suggestion: "Create public/ directory for static assets that should not be processed by Vite"
    });
    return { errors: [], warnings };
  }
  
  let totalSize = 0;
  const largeFiles = [];
  
  function walkDir(dir, relativePath = "") {
    const entries = readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      const relPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
      
      if (entry.isDirectory()) {
        walkDir(fullPath, relPath);
      } else {
        const stats = statSync(fullPath);
        totalSize += stats.size;
        
        const ext = extname(entry.name).toLowerCase();
        
        // Check image sizes
        if ([".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"].includes(ext)) {
          if (stats.size > THRESHOLDS.imageSize) {
            largeFiles.push({
              file: relPath,
              size: stats.size,
              type: "image"
            });
          }
        }
        
        // Check font sizes
        if ([".woff", ".woff2", ".ttf", ".otf", ".eot"].includes(ext)) {
          if (stats.size > THRESHOLDS.fontSize) {
            largeFiles.push({
              file: relPath,
              size: stats.size,
              type: "font"
            });
          }
        }
      }
    }
  }
  
  walkDir(PUBLIC_DIR);
  
  // Warn about large public directory
  if (totalSize > THRESHOLDS.publicDirSize) {
    warnings.push({
      message: `public/ directory is large (${(totalSize / 1024 / 1024).toFixed(2)} MB)`,
      file: "apps/web/public",
      suggestion: "Consider moving large assets to CDN or optimizing file sizes"
    });
  }
  
  // Warn about large individual files
  for (const file of largeFiles) {
    warnings.push({
      message: `Large ${file.type} in public/: ${file.file} (${(file.size / 1024).toFixed(2)} KB)`,
      file: `apps/web/public/${file.file}`,
      suggestion: file.type === "image" 
        ? "Compress image or serve from CDN. Consider WebP format for better compression."
        : "Subset font or use variable font format for smaller file size."
    });
  }
  
  return { errors: [], warnings };
}

/**
 * Check for image optimization plugins
 */
function checkImageOptimization() {
  const warnings = [];
  
  if (!existsSync(VITE_CONFIG)) {
    return { errors: [], warnings: [] };
  }
  
  const content = readFileSync(VITE_CONFIG, "utf-8");
  
  // Check for image optimization plugins
  const hasImageOptimization = 
    content.includes("vite-plugin-image-optimizer") ||
    content.includes("vite-imagetools") ||
    content.includes("vite-plugin-imagemin");
  
  if (!hasImageOptimization) {
    // Check if there are images in src/
    const srcDir = join(WEB_APP, "src");
    if (existsSync(srcDir)) {
      const hasImages = hasImageFiles(srcDir);
      
      if (hasImages) {
        warnings.push({
          message: "No image optimization plugin detected",
          file: "apps/web/vite.config.ts",
          suggestion: "Consider adding vite-imagetools or vite-plugin-image-optimizer for automatic image optimization"
        });
      }
    }
  }
  
  return { errors: [], warnings };
}

/**
 * Recursively check for image files
 */
function hasImageFiles(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    
    if (entry.isDirectory()) {
      if (hasImageFiles(fullPath)) return true;
    } else {
      const ext = extname(entry.name).toLowerCase();
      if ([".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(ext)) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Check asset naming patterns
 */
function checkAssetNaming() {
  const warnings = [];
  
  if (!existsSync(VITE_CONFIG)) {
    return { errors: [], warnings: [] };
  }
  
  const content = readFileSync(VITE_CONFIG, "utf-8");
  
  // Check for output.assetFileNames
  if (content.includes("output:")) {
    const assetFileNamesMatch = content.match(/assetFileNames:\s*["']([^"']+)["']/);
    
    if (!assetFileNamesMatch) {
      warnings.push({
        message: "assetFileNames not configured in rolldownOptions.output",
        file: "apps/web/vite.config.ts",
        suggestion: "Set explicit asset naming pattern for better cache control: assetFileNames: 'assets/[name]-[hash][extname]'"
      });
    }
  }
  
  return { errors: [], warnings };
}

/**
 * Main check function
 */
export default async function check(options = {}) {
  const errors = [];
  const warnings = [];
  
  // Check assetsInlineLimit
  const inlineLimitResult = checkAssetsInlineLimit();
  errors.push(...inlineLimitResult.errors);
  warnings.push(...inlineLimitResult.warnings);
  
  // Check public directory
  const publicDirResult = checkPublicDirectory();
  errors.push(...publicDirResult.errors);
  warnings.push(...publicDirResult.warnings);
  
  // Check image optimization
  const imageOptResult = checkImageOptimization();
  errors.push(...imageOptResult.errors);
  warnings.push(...imageOptResult.warnings);
  
  // Check asset naming
  const namingResult = checkAssetNaming();
  errors.push(...namingResult.errors);
  warnings.push(...namingResult.warnings);
  
  return { errors, warnings };
}
