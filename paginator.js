const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const PDFDocument = require('pdfkit');

// Constants
const HEADER_FOOTER_TEMPLATE = 'Header and Footer Template.png';
const CONTENT_OFFSET = 34; // pixels to offset original content down
const OUTPUT_PDF = 'final_document.pdf';

// Font paths - convert to base64 for SVG embedding
const ROBOTO_FONT = path.join(__dirname, 'fonts', 'Roboto-Regular.ttf');
const SOURCE_SANS_PRO_FONT = path.join(__dirname, 'fonts', 'SourceSansPro-Regular.ttf');

// Text positioning (in pixels for 2400x3392 images)
const TITLE_CONFIG = {
  x: 636,  // pixels from left (after the pipe "|") - moved 370px right
  y: 80,   // pixels from top (baseline) - moved up 3px
  fontSize: 32,  // font size in pixels - increased by 4px
  fontWeight: 'bold',
  color: '#000000'
};

const PAGE_NUMBER_CONFIG = {
  x: 2120,  // pixels from left (right side) - moved left 140px
  y: 3325,  // pixels from top (baseline, bottom area) - moved up 45px
  fontSize: 28,  // font size in pixels
  color: '#F5C842'  // yellow
};

/**
 * Scan directory for numbered PNG files (recursively checks subfolders)
 * @param {string} directory - Directory to scan
 * @param {string} subfolder - Optional subfolder path (used for recursion)
 * @returns {Array} Sorted array of file objects with page numbers
 */
function scanForPages(directory, subfolder = '') {
  const scanPath = subfolder ? path.join(directory, subfolder) : directory;
  const items = fs.readdirSync(scanPath);
  const pageFiles = [];

  items.forEach(item => {
    const fullPath = path.join(scanPath, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      // Skip if it's a subdirectory when already in a subfolder
      // (only scan one level deep)
      if (!subfolder) {
        const subfolderPages = scanForPages(directory, item);
        pageFiles.push(...subfolderPages);
      }
    } else if (stat.isFile()) {
      // Match files that start with a number followed by underscore
      const match = item.match(/^(\d+)_.*\.png$/i);
      if (match) {
        const pageNumber = parseInt(match[1], 10);
        pageFiles.push({
          filename: item,
          filepath: fullPath,
          pageNumber: pageNumber,
          subfolder: subfolder
        });
      }
    }
  });

  // Sort by page number
  pageFiles.sort((a, b) => a.pageNumber - b.pageNumber);

  return pageFiles;
}

/**
 * Create SVG text overlay
 * @param {string} text - Text to render
 * @param {number} x - X position
 * @param {number} y - Y position (baseline)
 * @param {string} fontSize - Font size
 * @param {string} color - Text color
 * @param {string} fontFamily - Font family name
 * @param {string} fontData - Base64 encoded font data
 * @param {number} width - SVG width
 * @param {number} height - SVG height
 * @param {string} fontWeight - Font weight (optional)
 * @returns {Buffer} SVG as buffer
 */
function createTextSVG(text, x, y, fontSize, color, fontFamily, fontData, width, height, fontWeight = 'normal') {
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <style type="text/css">
          @font-face {
            font-family: '${fontFamily}';
            src: url(data:font/truetype;charset=utf-8;base64,${fontData}) format('truetype');
          }
        </style>
      </defs>
      <text
        x="${x}"
        y="${y}"
        font-family="${fontFamily}"
        font-size="${fontSize}"
        font-weight="${fontWeight}"
        fill="${color}"
        text-anchor="start"
      >${text}</text>
    </svg>
  `;
  return Buffer.from(svg);
}

/**
 * Process a single page - composite original with template and add text
 * @param {string} originalPagePath - Path to original page PNG
 * @param {string} templatePath - Path to header/footer template
 * @param {string} title - Document title
 * @param {number} pageNumber - Page number
 * @param {string} robotoFontBase64 - Base64 encoded Roboto font
 * @param {string} sourceSansFontBase64 - Base64 encoded Source Sans font
 * @returns {Promise<Buffer>} Processed page as PNG buffer
 */
async function processPage(originalPagePath, templatePath, title, pageNumber, robotoFontBase64, sourceSansFontBase64) {
  try {
    // Page 1 is always the cover page - return it without modifications
    if (pageNumber === 1) {
      const originalImage = sharp(originalPagePath);
      return await originalImage.png().toBuffer();
    }

    // Step 1: Load template to get final dimensions
    const template = sharp(templatePath);
    const templateMeta = await template.metadata();
    const finalWidth = templateMeta.width;
    const finalHeight = templateMeta.height;

    // Step 2: Composite original content with template using Sharp
    const originalImage = sharp(originalPagePath);
    const originalMeta = await originalImage.metadata();

    // Resize original image if it's larger than template
    let processedOriginal = originalImage;
    if (originalMeta.width > finalWidth || originalMeta.height > finalHeight - CONTENT_OFFSET) {
      // Resize to fit within the available space
      const maxHeight = finalHeight - CONTENT_OFFSET;
      processedOriginal = originalImage.resize(finalWidth, maxHeight, {
        fit: 'inside',
        position: 'top'
      });
    }

    const baseImage = sharp({
      create: {
        width: finalWidth,
        height: finalHeight,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      }
    });

    const compositeLayers = [
      {
        input: await processedOriginal.toBuffer(),
        top: CONTENT_OFFSET,
        left: 0
      },
      {
        input: await template.toBuffer(),
        top: 0,
        left: 0
      }
    ];

    const compositeBuffer = await baseImage
      .composite(compositeLayers)
      .png()
      .toBuffer();

    // Step 3: Add title text using SVG
    const titleSVG = createTextSVG(
      title,
      TITLE_CONFIG.x,
      TITLE_CONFIG.y,
      TITLE_CONFIG.fontSize,
      TITLE_CONFIG.color,
      'Roboto',
      robotoFontBase64,
      finalWidth,
      finalHeight,
      TITLE_CONFIG.fontWeight
    );

    const withTitle = await sharp(compositeBuffer)
      .composite([{
        input: titleSVG,
        top: 0,
        left: 0
      }])
      .png()
      .toBuffer();

    // Step 4: Add page number text using SVG
    const pageNumText = `Pág. ${String(pageNumber).padStart(2, '0')}`;
    const pageNumSVG = createTextSVG(
      pageNumText,
      PAGE_NUMBER_CONFIG.x,
      PAGE_NUMBER_CONFIG.y,
      PAGE_NUMBER_CONFIG.fontSize,
      PAGE_NUMBER_CONFIG.color,
      'SourceSansPro',
      sourceSansFontBase64,
      finalWidth,
      finalHeight
    );

    const finalBuffer = await sharp(withTitle)
      .composite([{
        input: pageNumSVG,
        top: 0,
        left: 0
      }])
      .png()
      .toBuffer();

    return finalBuffer;

  } catch (error) {
    console.error(`Error processing page ${pageNumber}:`, error);
    throw error;
  }
}

/**
 * Generate PDF from processed page buffers
 * @param {Array<Buffer>} pageBuffers - Array of processed page buffers
 * @param {number} width - Page width in pixels
 * @param {number} height - Page height in pixels
 * @param {string} outputPath - Output PDF path
 */
async function generatePDF(pageBuffers, width, height, outputPath) {
  return new Promise((resolve, reject) => {
    try {
      // Convert pixels to points (72 DPI standard for PDF)
      const pageWidth = width * 0.75;
      const pageHeight = height * 0.75;

      const doc = new PDFDocument({
        size: [pageWidth, pageHeight],
        margin: 0,
        autoFirstPage: false
      });

      const writeStream = fs.createWriteStream(outputPath);
      doc.pipe(writeStream);

      // Add each page to PDF
      pageBuffers.forEach((buffer) => {
        doc.addPage({
          size: [pageWidth, pageHeight],
          margin: 0
        });

        doc.image(buffer, 0, 0, {
          width: pageWidth,
          height: pageHeight
        });
      });

      doc.end();

      writeStream.on('finish', () => {
        console.log(`✓ PDF generated successfully: ${outputPath}`);
        resolve();
      });

      writeStream.on('error', reject);

    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Main execution function
 */
async function main() {
  try {
    console.log('=== PDF Paginator ===\n');

    // Get document title from command line argument
    const title = process.argv[2];

    if (!title || !title.trim()) {
      console.error('Error: Please provide a document title as argument');
      console.error('Usage: node paginator.js "DOCUMENT TITLE"');
      process.exit(1);
    }

    // Load fonts as base64
    console.log('Loading fonts...');
    const robotoFont = fs.readFileSync(ROBOTO_FONT);
    const robotoFontBase64 = robotoFont.toString('base64');
    const sourceSansFont = fs.readFileSync(SOURCE_SANS_PRO_FONT);
    const sourceSansFontBase64 = sourceSansFont.toString('base64');

    // Check if template exists
    const templatePath = path.join(__dirname, HEADER_FOOTER_TEMPLATE);
    if (!fs.existsSync(templatePath)) {
      console.error(`Error: Template file not found: ${HEADER_FOOTER_TEMPLATE}`);
      process.exit(1);
    }

    // Scan for page files
    console.log('\nScanning for page files...');
    const pageFiles = scanForPages(__dirname);

    if (pageFiles.length === 0) {
      console.error('Error: No numbered page files found (format: {number}_*.png)');
      process.exit(1);
    }

    console.log(`Found ${pageFiles.length} page(s):`);
    pageFiles.forEach(page => {
      const location = page.subfolder ? `${page.subfolder}/` : '';
      console.log(`  - Page ${page.pageNumber}: ${location}${page.filename}`);
    });

    // Process each page
    console.log('\nProcessing pages...');
    const processedBuffers = [];
    let pageWidth, pageHeight;

    for (const page of pageFiles) {
      console.log(`  Processing page ${page.pageNumber}...`);
      const buffer = await processPage(
        page.filepath,
        templatePath,
        title,
        page.pageNumber,
        robotoFontBase64,
        sourceSansFontBase64
      );

      // Get dimensions from first page
      if (!pageWidth) {
        const meta = await sharp(buffer).metadata();
        pageWidth = meta.width;
        pageHeight = meta.height;
      }

      processedBuffers.push(buffer);
    }

    // Generate PDF
    console.log('\nGenerating PDF...');
    await generatePDF(
      processedBuffers,
      pageWidth,
      pageHeight,
      path.join(__dirname, OUTPUT_PDF)
    );

    console.log('\n✓ Done! All pages processed successfully.');

  } catch (error) {
    console.error('\n✗ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { scanForPages, processPage, generatePDF };
