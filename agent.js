const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { processPage, generatePDF } = require('./paginator');
const sharp = require('sharp');

// Configuration
const PORT = process.env.PORT || 3838;
const API_KEY = process.env.API_KEY || crypto.randomBytes(32).toString('hex');

// Store API key for user reference
if (!process.env.API_KEY) {
  console.log('\n' + '='.repeat(60));
  console.log('Generated API Key (save this for web interface):');
  console.log(API_KEY);
  console.log('='.repeat(60) + '\n');

  // Save to file for easy reference
  fs.writeFileSync(path.join(__dirname, '.api-key'), API_KEY, 'utf8');
}

// Constants from paginator
const HEADER_FOOTER_TEMPLATE = 'Header and Footer Template.png';
const ROBOTO_FONT = path.join(__dirname, 'fonts', 'Roboto-Regular.ttf');
const SOURCE_SANS_PRO_FONT = path.join(__dirname, 'fonts', 'SourceSansPro-Regular.ttf');
const OUTPUT_PDF = 'final_document.pdf';

// Initialize Express app
const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Create HTTP server
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Track active processing jobs
const activeJobs = new Map();

// Authentication middleware
function authenticateApiKey(req, res, next) {
  const providedKey = req.headers['x-api-key'];
  if (!providedKey || providedKey !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized: Invalid API key' });
  }
  next();
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'online',
    version: '2.0.0',
    capabilities: ['pdf-generation', 'batch-upload']
  });
});

// Process PDF endpoint
app.post('/process', authenticateApiKey, async (req, res) => {
  try {
    const { title, files } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Document title is required' });
    }

    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: 'At least one file is required' });
    }

    console.log(`\n[${new Date().toLocaleTimeString()}] Processing request: "${title}" with ${files.length} file(s)`);

    // Create job ID
    const jobId = crypto.randomBytes(16).toString('hex');
    activeJobs.set(jobId, { status: 'processing', progress: 0 });

    // Process in background
    processJob(jobId, title, files, req.headers['x-return-pdf'] === 'true')
      .then(result => {
        activeJobs.set(jobId, { status: 'completed', result });
        if (req.headers['x-return-pdf'] === 'true') {
          // Send PDF back to client
          res.json({
            jobId,
            status: 'completed',
            pdfData: result.pdfData,
            savedPath: result.savedPath
          });
        }
      })
      .catch(error => {
        activeJobs.set(jobId, { status: 'failed', error: error.message });
        if (!res.headersSent) {
          res.status(500).json({ error: error.message });
        }
      });

    // If not returning PDF, respond immediately
    if (req.headers['x-return-pdf'] !== 'true') {
      res.json({
        jobId,
        status: 'processing',
        message: 'PDF generation started'
      });
    }

  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({ error: error.message });
  }
});

// Job status endpoint
app.get('/job/:jobId', authenticateApiKey, (req, res) => {
  const job = activeJobs.get(req.params.jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  res.json(job);
});

// WebSocket connection handler
wss.on('connection', (ws, req) => {
  console.log(`\n[${new Date().toLocaleTimeString()}] WebSocket client connected`);

  let authenticated = false;

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);

      // Handle authentication
      if (data.type === 'authenticate') {
        if (data.apiKey === API_KEY) {
          authenticated = true;
          ws.send(JSON.stringify({ type: 'authenticated', success: true }));
          console.log('Client authenticated successfully');
        } else {
          ws.send(JSON.stringify({ type: 'authenticated', success: false, error: 'Invalid API key' }));
          ws.close();
        }
        return;
      }

      // Require authentication for other commands
      if (!authenticated) {
        ws.send(JSON.stringify({ type: 'error', error: 'Not authenticated' }));
        return;
      }

      // Handle process command
      if (data.type === 'process') {
        const { title, files, returnPdf } = data;

        if (!title || !title.trim()) {
          ws.send(JSON.stringify({ type: 'error', error: 'Document title is required' }));
          return;
        }

        if (!files || !Array.isArray(files) || files.length === 0) {
          ws.send(JSON.stringify({ type: 'error', error: 'At least one file is required' }));
          return;
        }

        console.log(`Processing: "${title}" with ${files.length} file(s)`);

        ws.send(JSON.stringify({ type: 'status', status: 'processing', message: 'Starting PDF generation...' }));

        try {
          const result = await processJob(null, title, files, returnPdf, (progress) => {
            ws.send(JSON.stringify({ type: 'progress', progress }));
          });

          ws.send(JSON.stringify({
            type: 'completed',
            savedPath: result.savedPath,
            pdfData: returnPdf ? result.pdfData : null
          }));

          console.log(`✓ PDF generated successfully: ${result.savedPath}`);

        } catch (error) {
          console.error('Processing error:', error);
          ws.send(JSON.stringify({ type: 'error', error: error.message }));
        }
      }

    } catch (error) {
      console.error('WebSocket message error:', error);
      ws.send(JSON.stringify({ type: 'error', error: 'Invalid message format' }));
    }
  });

  ws.on('close', () => {
    console.log(`[${new Date().toLocaleTimeString()}] WebSocket client disconnected`);
  });
});

/**
 * Process PDF generation job
 * @param {string} jobId - Job identifier (optional)
 * @param {string} title - Document title
 * @param {Array} files - Array of file objects with name and base64 data
 * @param {boolean} returnPdf - Whether to return PDF data
 * @param {Function} progressCallback - Progress callback function
 * @returns {Promise<Object>} Result with savedPath and optional pdfData
 */
async function processJob(jobId, title, files, returnPdf = false, progressCallback = null) {
  // Load fonts as base64
  const robotoFont = fs.readFileSync(ROBOTO_FONT);
  const robotoFontBase64 = robotoFont.toString('base64');
  const sourceSansFont = fs.readFileSync(SOURCE_SANS_PRO_FONT);
  const sourceSansFontBase64 = sourceSansFont.toString('base64');

  // Load template
  const templatePath = path.join(__dirname, HEADER_FOOTER_TEMPLATE);
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template file not found: ${HEADER_FOOTER_TEMPLATE}`);
  }

  // Parse and sort files
  const pageFiles = files.map(file => {
    // Extract page number from filename
    const match = file.name.match(/^(\d+)_.*\.png$/i);
    if (!match) {
      throw new Error(`Invalid filename format: ${file.name}. Expected: {number}_*.png`);
    }

    const pageNumber = parseInt(match[1], 10);

    // Decode base64 data
    const base64Data = file.data.split(',')[1] || file.data;
    const buffer = Buffer.from(base64Data, 'base64');

    return {
      filename: file.name,
      pageNumber,
      buffer
    };
  }).sort((a, b) => a.pageNumber - b.pageNumber);

  console.log(`  Found ${pageFiles.length} page(s) to process`);

  // Process each page
  const processedBuffers = [];
  let pageWidth, pageHeight;

  for (let i = 0; i < pageFiles.length; i++) {
    const page = pageFiles[i];
    console.log(`  Processing page ${page.pageNumber}...`);

    if (progressCallback) {
      progressCallback({
        current: i + 1,
        total: pageFiles.length,
        page: page.pageNumber
      });
    }

    // Save buffer to temporary file for processing
    const tempPath = path.join(__dirname, `temp_${page.pageNumber}.png`);
    fs.writeFileSync(tempPath, page.buffer);

    try {
      const buffer = await processPage(
        tempPath,
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

      // Clean up temp file
      fs.unlinkSync(tempPath);

    } catch (error) {
      // Clean up temp file on error
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
      throw error;
    }
  }

  // Generate PDF
  console.log('  Generating PDF...');
  const outputPath = path.join(__dirname, OUTPUT_PDF);

  await generatePDF(
    processedBuffers,
    pageWidth,
    pageHeight,
    outputPath
  );

  const result = {
    savedPath: outputPath
  };

  // Read PDF data if requested
  if (returnPdf) {
    const pdfBuffer = fs.readFileSync(outputPath);
    result.pdfData = pdfBuffer.toString('base64');
  }

  return result;
}

// Start server
server.listen(PORT, () => {
  console.log('\n' + '='.repeat(60));
  console.log('  PDF Paginator Agent - Remote Control Server');
  console.log('='.repeat(60));
  console.log(`\n  Status: ONLINE`);
  console.log(`  HTTP:   http://localhost:${PORT}`);
  console.log(`  WebSocket: ws://localhost:${PORT}`);
  console.log(`  API Key: ${API_KEY}`);
  console.log(`\n  Ready to receive commands from web interface!\n`);
  console.log('='.repeat(60) + '\n');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\nShutting down agent...');
  server.close(() => {
    console.log('Agent stopped.');
    process.exit(0);
  });
});
