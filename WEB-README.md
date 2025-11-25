# PDF Paginator - Web Remote Control

Version 2.0 adds a modern web interface that lets you control PDF generation from any device while files are processed locally on your computer.

## 🌟 What's New in v2.0

- **Remote Control**: Access from phone, tablet, or any computer
- **Web Interface**: Modern drag-and-drop file upload interface
- **Batch Upload**: Upload multiple PNG files at once
- **Real-time Progress**: See processing status in real-time
- **Dual Mode**: Download PDF to browser OR save to local folder (or both!)
- **Free Hosting**: Web interface can be hosted on GitHub Pages/Netlify for free
- **Secure**: API key authentication protects your agent

## 🏗️ Architecture

```
┌─────────────────┐         WebSocket          ┌──────────────────┐
│  Web Interface  │ ◄────────────────────────► │   Local Agent    │
│  (Any Device)   │       (Secure API Key)      │  (Your Computer) │
└─────────────────┘                             └──────────────────┘
        │                                                 │
        │                                                 │
        ▼                                                 ▼
   Download PDF                                    Save to Folder
   to Browser                                    + Process Files
```

**Web Interface**: Static HTML/CSS/JS hosted anywhere (GitHub Pages, Netlify, etc.)
**Local Agent**: Node.js WebSocket server running on your computer

## 🚀 Quick Start

### 1. Start the Local Agent

**Windows:**
```bash
Double-click: start-agent.bat
```

**Mac/Linux:**
```bash
npm install  # First time only
npm run agent
```

The agent will:
- Start a WebSocket server on port 3838
- Generate an API key (saved in `.api-key` file)
- Display connection information

**Example Output:**
```
============================================================
  PDF Paginator Agent - Remote Control Server
============================================================
Generated API Key (save this for web interface):
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
============================================================

  Status: ONLINE
  HTTP:   http://localhost:3838
  WebSocket: ws://localhost:3838
  API Key: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6

  Ready to receive commands from web interface!
============================================================
```

### 2. Open the Web Interface

**Option A: Open Locally (Easiest for Testing)**
```bash
# Open web/index.html directly in your browser
open web/index.html  # Mac
start web/index.html  # Windows
xdg-open web/index.html  # Linux
```

**Option B: Deploy to GitHub Pages (For Remote Access)**

See "Deploying Web Interface" section below.

### 3. Connect and Use

1. Enter the WebSocket URL: `ws://localhost:3838`
2. Enter the API key from the agent console
3. Click "Connect to Agent"
4. Upload PNG files (drag & drop or click to browse)
5. Enter document title
6. Choose whether to download PDF or just save locally
7. Click "Generate PDF"

## 📁 New File Structure

```
Paginator/
├── agent.js                          ⭐ NEW: WebSocket server
├── start-agent.bat                   ⭐ NEW: Easy agent launcher
├── .api-key                          ⭐ NEW: Generated API key (auto-created)
├── web/                              ⭐ NEW: Web interface files
│   ├── index.html                    (Main interface)
│   ├── app.js                        (Client JavaScript)
│   └── style.css                     (Modern styling)
├── package.json                      (Updated with new dependencies)
├── WEB-README.md                     (This file)
├── README.md                         (Original v1.0 documentation)
├── paginator.js                      (Unchanged - original script)
├── create-pdf.bat                    (Unchanged - original batch file)
├── fonts/
│   ├── Roboto-Regular.ttf
│   └── SourceSansPro-Regular.ttf
├── Header and Footer Template.png
└── final_document.pdf                (Generated output)
```

## 🌐 Deploying Web Interface

The web interface is pure HTML/CSS/JS and can be hosted anywhere. Here's how to deploy to GitHub Pages (free):

### GitHub Pages Deployment

1. **Create a GitHub Repository**
   ```bash
   cd Paginator
   git init
   git add web/
   git commit -m "Add web interface"
   ```

2. **Push to GitHub**
   ```bash
   # Create a new repo on GitHub, then:
   git remote add origin https://github.com/yourusername/pdf-paginator-web.git
   git branch -M main
   git push -u origin main
   ```

3. **Enable GitHub Pages**
   - Go to repository Settings → Pages
   - Source: Deploy from branch "main"
   - Folder: `/web` (or root if you moved files)
   - Save

4. **Access Your Interface**
   - URL: `https://yourusername.github.io/pdf-paginator-web/`
   - Can now access from any device with internet!

### Alternative: Netlify Deployment

1. **Create Netlify Account** (free)
2. **Drag and Drop**
   - Drag the `web/` folder to Netlify dashboard
3. **Done!**
   - Get instant URL like `https://random-name-12345.netlify.app`

## 🔒 Security

### API Key Authentication
- Every request requires the API key
- API key is generated randomly on first run
- Stored in `.api-key` file for reference
- Connection rejected if key doesn't match

### Network Security
- Agent runs on `localhost` by default (not exposed to internet)
- To allow remote access from other devices on your network:
  ```bash
  # Find your local IP address
  ipconfig  # Windows
  ifconfig  # Mac/Linux

  # Then use: ws://YOUR-IP:3838 in the web interface
  # Example: ws://192.168.1.100:3838
  ```

### HTTPS/WSS (Optional)
For production use with SSL:
```bash
# Set environment variables
export USE_SSL=true
export SSL_CERT=/path/to/cert.pem
export SSL_KEY=/path/to/key.pem
npm run agent
```

## 🔧 Advanced Configuration

### Environment Variables

```bash
# Port (default: 3838)
export PORT=8080

# Custom API Key (instead of random)
export API_KEY=your-secret-key-here

# SSL Configuration
export USE_SSL=true
export SSL_CERT=/path/to/cert.pem
export SSL_KEY=/path/to/key.pem
```

### Using Custom Agent URL

If running agent on different port or remote server:
```javascript
// In web interface, enter:
ws://your-computer-ip:custom-port
```

### Development Mode

For auto-restart on code changes:
```bash
npm run agent:dev  # Uses nodemon
```

## 📱 Using from Mobile Devices

1. **Start agent on your computer**
2. **Find your computer's local IP address**
   - Windows: `ipconfig` → Look for "IPv4 Address"
   - Mac: System Preferences → Network
   - Linux: `ip addr show`
3. **On your mobile device**
   - Open browser to web interface URL
   - Enter WebSocket URL: `ws://YOUR-IP:3838`
   - Enter API key
   - Upload and process files!

**Note**: Both devices must be on the same WiFi network.

## 🎯 Use Cases

### Use Case 1: Work from Tablet
- Scan documents on your tablet
- Upload directly from tablet browser
- Agent processes on powerful desktop computer
- Download finished PDF to tablet

### Use Case 2: Remote Office
- Deploy web interface to GitHub Pages
- Start agent on office computer before leaving
- Access from home via VPN/remote desktop
- Generate PDFs using office computer's resources

### Use Case 3: Multiple Users
- One computer runs the agent
- Share web interface URL with team
- Each person can submit their own documents
- All PDFs saved to central computer

## 🐛 Troubleshooting

### "Connection Failed"
- **Check agent is running**: Look for "ONLINE" status
- **Check URL**: Should be `ws://localhost:3838` (not http://)
- **Check firewall**: May need to allow port 3838
- **Check API key**: Must match exactly

### "Authentication Failed"
- Copy API key from agent console or `.api-key` file
- Paste exactly (no extra spaces)
- API key is case-sensitive

### "Template not found"
- Ensure `Header and Footer Template.png` exists
- Must be in same folder as `agent.js`

### "Font errors"
- Check `fonts/` directory exists
- Ensure both `.ttf` files are present
- Re-download fonts if corrupted

### Web interface works but can't connect from other devices
- **Firewall blocking**: Allow port 3838 in Windows Firewall
- **Wrong IP**: Use local IP (192.168.x.x), not public IP
- **Different networks**: Devices must be on same WiFi

### Files upload but processing fails
- **Check file names**: Must match `{number}_*.png` format
- **Check file size**: Very large files may timeout
- **Check agent logs**: Error details shown in console

## 📊 API Reference

The agent exposes both WebSocket and HTTP endpoints:

### WebSocket Messages

**Authenticate:**
```json
{
  "type": "authenticate",
  "apiKey": "your-api-key"
}
```

**Process PDF:**
```json
{
  "type": "process",
  "title": "DOCUMENT TITLE",
  "files": [
    {
      "name": "1_cover.png",
      "data": "base64-encoded-data"
    }
  ],
  "returnPdf": true
}
```

**Responses:**
```json
// Progress
{ "type": "progress", "progress": { "current": 2, "total": 10, "page": 2 } }

// Completed
{ "type": "completed", "savedPath": "/path/to/pdf", "pdfData": "base64..." }

// Error
{ "type": "error", "error": "Error message" }
```

### HTTP Endpoints

**Health Check:**
```bash
GET /health
# Response: { "status": "online", "version": "2.0.0" }
```

**Process (with API key header):**
```bash
POST /process
Headers:
  X-API-Key: your-api-key
  X-Return-PDF: true
Body: { "title": "...", "files": [...] }
```

## 🔄 Migrating from v1.0

**Good news**: v1.0 still works exactly the same!

- `paginator.js` unchanged - use directly as before
- `create-pdf.bat` unchanged - still works
- All original features preserved
- v2.0 adds new capabilities without breaking old ones

**To use v2.0 features:**
1. Run `npm install` to get new dependencies
2. Start agent with `start-agent.bat`
3. Open web interface

**To keep using v1.0 only:**
- Just use `create-pdf.bat` as before
- No need to start agent
- No need to use web interface

## 🆘 Getting Help

1. **Check agent console** for detailed error messages
2. **Check browser console** (F12) for client-side errors
3. **Verify all files** are in correct locations
4. **Test locally first** before deploying remotely
5. **Check firewall settings** if remote access fails

## 📝 Version History

**v2.0.0** (Current)
- Added web interface with drag-and-drop upload
- Added WebSocket agent for remote control
- Added real-time progress tracking
- Added dual-mode: download or save locally
- Preserved all v1.0 functionality

**v1.0.0**
- Original command-line interface
- Batch file for easy Windows usage
- Local file processing only

## 📄 License

ISC

---

**Made with ❤️ for easy PDF creation**
