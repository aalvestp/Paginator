# PDF Paginator

Automated tool to add headers and footers to scanned PNG pages and compile them into a single PDF document.

## Features

- Scans folder for numbered PNG files (root directory or subfolders)
- Automatically skips header/footer for page 1 (cover page)
- Adds custom header with document title in bold
- Adds footer with page numbers in yellow
- Offsets original content by 34px to accommodate header/footer
- Generates a single compiled PDF from all pages
- Maintains proper page ordering
- Handles variable image sizes automatically

## Requirements

- Node.js (v14 or higher)
- npm

## Quick Start (Windows)

**The easiest way to use this tool:**

1. Double-click `create-pdf.bat`
2. Enter your document title when prompted
3. Wait for processing to complete
4. Your PDF will be generated and automatically opened!

The batch file will:
- Check if Node.js is installed
- Install dependencies if needed
- Validate the template file exists
- Run the paginator script
- Open the generated PDF

## Manual Installation

If you prefer to run manually or are on Mac/Linux:

1. Navigate to the project directory
2. Install dependencies:

```bash
npm install
```

**Note**: The fonts (Roboto and Source Sans Pro) are already included in the `fonts/` directory.

## File Structure

```
Paginator/
├── fonts/
│   ├── Roboto-Regular.ttf           (for title text)
│   └── SourceSansPro-Regular.ttf    (for page numbers)
├── Header and Footer Template.png   (template overlay)
├── {number}_*.png                   (your page files - in root or subfolder)
├── Subfolder/                       (optional - can contain page files)
│   ├── {number}_*.png
│   └── ...
├── create-pdf.bat                   (easy-to-use batch file)
├── paginator.js                     (main script)
├── package.json
├── README.md
└── final_document.pdf               (output - generated)
```

## Page File Naming Convention

Page files must follow this naming pattern:
```
{number}_{description}.png
```

Examples:
- `1_Introduction.png`
- `2_Chapter-One.png`
- `6_Predicado-Verbo-Nominal.png`

The script will:
- Extract the page number from the filename
- Sort pages numerically
- Use the number for page numbering in the footer

## Usage

Run the script with your document title as an argument:

```bash
node paginator.js "DOCUMENT TITLE"
```

Example:
```bash
node paginator.js "LÍNGUA PORTUGUESA"
```

### What the script does:

1. **Prompts for title**: Pass as command-line argument
2. **Scans directory**: Finds all files matching `{number}_*.png`
3. **Sorts pages**: Orders by the leading number
4. **Processes each page**:
   - Loads the original page PNG
   - Offsets content down by 34 pixels
   - Overlays the header/footer template
   - Adds title text in Roboto font
   - Adds page number in Source Sans Pro font (format: "Pág. 04")
5. **Generates PDF**: Compiles all processed pages into `final_document.pdf`

## Configuration

You can modify these constants in `paginator.js`:

```javascript
// Content offset from top (pixels)
const CONTENT_OFFSET = 34;

// Output filename
const OUTPUT_PDF = 'final_document.pdf';

// Title text positioning and styling
const TITLE_CONFIG = {
  x: 152,
  y: 24,
  fontSize: 11,
  font: ROBOTO_FONT,
  color: '#000000'
};

// Page number positioning and styling
const PAGE_NUMBER_CONFIG = {
  x: 565,
  y: 1268,
  fontSize: 11,
  font: SOURCE_SANS_PRO_FONT,
  color: '#F5C842'
};
```

## Example Output

**Before**: Original page without header/footer
**After**: Page with "Operação Concursos | LÍNGUA PORTUGUESA" header and "Pág. 04" footer

## Template Requirements

The `Header and Footer Template.png` file must:
- Match the width of your page files
- Contain the header and footer graphics
- Have transparent or white background for the content area
- Include any logos, borders, or design elements

## Troubleshooting

### No pages found
- Ensure files follow the naming pattern: `{number}_*.png`
- Check that files are in the same directory as the script

### Template not found
- Verify `Header and Footer Template.png` exists in the directory
- Check filename matches exactly (case-sensitive)

### Font issues
- Ensure font files exist in the `fonts/` directory
- Fonts are bundled with the project

### PDF quality issues
- Ensure original PNGs are high resolution
- Template PNG should match the resolution of source files

## License

ISC
