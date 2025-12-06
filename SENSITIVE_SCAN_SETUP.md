# Sensitive Document Scanning - Setup Guide

## ✅ Feature Overview

The system automatically scans uploaded documents (PDF, TXT, DOC, DOCX, RTF) for sensitive information and displays user-friendly warnings.

### Detected Sensitive Information:
- **Email addresses** - Detected via regex pattern
- **Phone numbers** - Detected via regex pattern  
- **Usernames** - Detected via keyword patterns (username, login id)
- **Passwords** - Detected via keyword patterns (password, pwd)
- **Other credentials** - OTP, SSN, PAN, Aadhar, security questions, etc.

## 🚀 Setup Instructions

### 1. Install Backend Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Install spaCy Model (Optional but Recommended)

For enhanced detection accuracy:

```bash
python -m spacy download en_core_web_sm
```

**Note**: spaCy is optional. The system works without it but has better detection with it.

### 3. Run Database Migration

```bash
cd backend
python manage.py migrate
```

This will add the `sensitive_detected`, `sensitive_markers`, and `sensitive_summary` fields to the File model.

### 4. Configure Settings (Optional)

You can customize scanning behavior via environment variables:

```bash
# Enable/disable scanning (default: true)
SENSITIVE_SCAN_ENABLED=true

# File types to scan (default: pdf,txt,doc,docx,rtf)
SENSITIVE_SCAN_EXTENSIONS=pdf,txt,doc,docx,rtf

# Maximum file size to scan (default: 2MB)
SENSITIVE_SCAN_MAX_BYTES=2097152

# Maximum text characters to analyze (default: 400,000)
SENSITIVE_SCAN_MAX_TEXT_CHARS=400000

# Maximum PDF pages to scan (default: 25)
SENSITIVE_SCAN_MAX_PDF_PAGES=25

# spaCy model name (default: en_core_web_sm)
SENSITIVE_SPACY_MODEL=en_core_web_sm
```

## 📋 How It Works

### Backend Flow:
1. User uploads a document (PDF, TXT, DOC, DOCX, RTF)
2. File is validated and stored temporarily
3. **Sensitive scan runs automatically**:
   - Extracts text from the document
   - Scans for email, phone, username, password patterns
   - Uses spaCy NLP (if available) for enhanced detection
   - Generates user-friendly summary
4. Results stored in database:
   - `sensitive_detected`: Boolean flag
   - `sensitive_markers`: List of detected types (e.g., ["email", "phone"])
   - `sensitive_summary`: Human-readable message (e.g., "Contains email address and phone number")
5. File record created with sensitive info metadata

### Frontend Flow:
1. User uploads file
2. Upload completes successfully
3. **If sensitive info detected**:
   - Amber warning notification appears immediately
   - Message: "Heads up: Contains email address and phone number. Please review before sharing."
   - Notification auto-dismisses after 5 seconds
4. In file list:
   - Files with sensitive info show amber badge
   - Badge displays summary (e.g., "Contains email address")
   - Persistent reminder visible in file list

## 🎨 User Interface

### Upload Notification
- **Location**: Below upload area
- **Style**: Amber/yellow background with shield icon
- **Duration**: 5 seconds (auto-dismiss)
- **Message**: Friendly description of detected sensitive info

### File List Badge
- **Location**: Next to filename in file list
- **Style**: Amber pill badge with shield icon
- **Visibility**: Always visible for files with sensitive info
- **Purpose**: Persistent reminder before sharing

## 🔍 Detection Examples

### Example 1: Email Detection
**Document contains**: "Contact us at support@example.com"
**Detection**: ✅ Email address found
**Notification**: "Heads up: Contains email address. Please review before sharing."

### Example 2: Multiple Types
**Document contains**: 
- "Username: john_doe"
- "Password: secret123"
- "Email: john@example.com"
- "Phone: +1-555-123-4567"

**Detection**: ✅ Username, Password, Email, Phone
**Notification**: "Heads up: Contains username, password, email address and phone number. Please review before sharing."

### Example 3: No Sensitive Info
**Document contains**: "This is a regular document with no sensitive information."
**Detection**: ❌ No sensitive info found
**Notification**: None (no warning shown)

## 🛠️ Technical Details

### Supported File Formats:
- **PDF** - Uses `pypdf` library
- **DOCX** - Uses `python-docx` library
- **TXT** - Direct text reading
- **RTF** - Uses `striprtf` library
- **DOC** - Uses `textract` library (requires system dependencies)

### Detection Methods:
1. **Regex Patterns**: Email, phone number patterns
2. **Keyword Matching**: Username, password keywords
3. **NLP Enhancement**: spaCy entity recognition (optional)

### Performance:
- Scans run during upload (non-blocking)
- Large files (>2MB) are skipped for performance
- PDFs limited to first 25 pages
- Text analysis limited to 400,000 characters

## 📝 Files Modified

### Backend:
- `backend/files/sensitive_scan.py` - Core scanning logic
- `backend/files/views.py` - Integration in upload flow
- `backend/files/models.py` - Database fields
- `backend/files/serializers.py` - API response fields
- `backend/files/migrations/0005_sensitive_fields.py` - Database migration
- `backend/core/settings.py` - Configuration options
- `backend/requirements.txt` - Dependencies

### Frontend:
- `frontend/src/components/FileUpload.tsx` - Upload notification
- `frontend/src/components/FileList.tsx` - File list badge
- `frontend/src/types/file.ts` - TypeScript types

## ✅ Verification

To verify the feature is working:

1. **Test with email**: Create a TXT file containing "test@example.com"
2. **Upload the file**: Use the upload interface
3. **Check notification**: Should see amber warning about email address
4. **Check file list**: File should show amber badge
5. **Check API response**: File object should have `sensitive_detected: true`

## 🐛 Troubleshooting

### Issue: No notifications appearing
**Solution**: 
- Check that migration ran: `python manage.py migrate`
- Verify `SENSITIVE_SCAN_ENABLED=true` in settings
- Check browser console for errors

### Issue: Detection not working
**Solution**:
- Verify dependencies installed: `pip install -r requirements.txt`
- Check file extension is in supported list (pdf, txt, doc, docx, rtf)
- Verify file size is under 2MB (configurable)

### Issue: spaCy errors
**Solution**:
- Install model: `python -m spacy download en_core_web_sm`
- Or disable spaCy by not installing it (system works without it)

## 📚 Additional Notes

- Scanning is **non-blocking** - uploads complete even if scan fails
- Results are **stored in database** for future reference
- **Privacy-focused**: Only metadata stored, not actual sensitive content
- **Configurable**: All limits and settings can be adjusted via environment variables

