# Secure Cloudinary Document Upload - Setup Guide

## ✅ What Was Implemented

The system now uses a **secure backend proxy** for file uploads instead of direct client-side uploads to Cloudinary.

### Architecture
```
Frontend → Backend API → Cloudinary → Database
```

### Security Features
- ✅ Server-side file validation (type, size)
- ✅ Signed uploads using Cloudinary SDK
- ✅ File size limit: 10MB
- ✅ Secure credential storage in backend
- ✅ Document deletion from both Cloudinary and database
- ✅ Proper error handling and logging
- ✅ Authentication required for uploads

---

## 🔧 Configuration Required

### 1. Get Cloudinary Credentials

1. Go to [Cloudinary Console](https://cloudinary.com/console)
2. Sign up or log in
3. From your dashboard, copy:
   - **Cloud Name**
   - **API Key**
   - **API Secret**

### 2. Update Backend Environment Variables

Edit `backend/.env` and replace the placeholder values:

```env
# Cloudinary Configuration for Document Uploads
CLOUDINARY_CLOUD_NAME=your_actual_cloud_name
CLOUDINARY_API_KEY=your_actual_api_key
CLOUDINARY_API_SECRET=your_actual_api_secret
CLOUDINARY_FOLDER=aethertrack/documents
```

### 3. Restart Backend Server

```bash
cd backend
npm start
```

---

## 📁 Files Modified/Created

### Backend
- ✅ `backend/config/cloudinary.js` - Cloudinary configuration and utilities
- ✅ `backend/routes/projects.js` - Added upload and delete endpoints
- ✅ `backend/.env` - Added Cloudinary credentials
- ✅ `backend/package.json` - Added `cloudinary` and `multer` packages

### Frontend
- ✅ `frontend/src/pages/ProjectDetail.jsx` - Updated to use backend API

---

## 🔌 API Endpoints

### Upload Document
```
POST /api/projects/:id/upload-document
Content-Type: multipart/form-data
Authorization: Bearer <token>

Body:
- file: File (required)
- name: String (optional, defaults to filename)

Response:
{
  "success": true,
  "message": "Document uploaded successfully",
  "document": { name, url, type, size, uploadedAt, uploadedBy },
  "cloudinary": { public_id, url }
}
```

### Delete Document
```
DELETE /api/projects/:id/documents/:docIndex
Authorization: Bearer <token>

Response:
{
  "success": true,
  "message": "Document deleted successfully"
}
```

---

## 📝 Supported File Types

- **Documents**: PDF, DOC, DOCX, TXT, RTF, CSV
- **Spreadsheets**: XLS, XLSX
- **Presentations**: PPT, PPTX
- **Images**: JPG, PNG, GIF, SVG, WebP
- **Archives**: ZIP, RAR, 7Z
- **Data**: JSON, XML

---

## 🛡️ Security Features

### Backend Validation
- File type whitelist (only allowed types can be uploaded)
- File size limit (10MB max)
- Authentication required
- Multer handles multipart form data securely

### Cloudinary Configuration
- Files stored in dedicated folder: `aethertrack/documents`
- Signed uploads using API credentials
- Public IDs include timestamps to prevent naming conflicts
- Automatic resource type detection

### Database
- Document metadata stored in MongoDB
- References Cloudinary URLs
- Tracks uploader and upload time

---

## 🧪 Testing

### Test Upload
1. Navigate to any project details page
2. Click on "Documents" tab
3. Click "Upload Document" button
4. Select a file (max 10MB)
5. Optionally enter a custom name
6. Click "Upload"

### Test Delete
1. Hover over any document card
2. Click the "Delete" button
3. Confirm deletion
4. Document removed from both Cloudinary and database

---

## ⚠️ Important Notes

### Before Production Deployment
1. **Never commit `.env` files** - Add to `.gitignore`
2. **Set environment variables** in your hosting platform (Render, Vercel, etc.)
3. **Enable Cloudinary virus scanning** (available in paid plans)
4. **Consider rate limiting** on upload endpoints
5. **Monitor Cloudinary usage** to stay within free tier limits

### Cloudinary Free Tier Limits
- **Storage**: 25GB
- **Bandwidth**: 25GB/month
- **Transformations**: 25,000/month
- **File Size**: 10MB per file (configured in code)

---

## 🔍 Troubleshooting

### "Error uploading document"
- Check backend logs for specific error
- Verify Cloudinary credentials are correct
- Ensure file size is under 10MB
- Confirm file type is supported

### "File type not supported"
- Check allowed types in `backend/config/cloudinary.js`
- Add new MIME types if needed

### "Document not deleted from Cloudinary"
- Check if URL format is correct
- Verify API credentials have delete permissions
- Database record will still be removed even if Cloudinary deletion fails

### CORS Errors
- Ensure frontend is using backend API endpoint
- Check `CLIENT_URL` in backend `.env` matches frontend URL

---

## 📚 Additional Resources

- [Cloudinary Documentation](https://cloudinary.com/documentation)
- [Multer Documentation](https://github.com/expressjs/multer)
- [Cloudinary Node.js SDK](https://cloudinary.com/documentation/node_integration)

---

## 🚀 Next Steps (Optional Enhancements)

1. **Add Progress Indicators**: Show upload progress percentage
2. **Drag & Drop**: Implement drag-and-drop file upload
3. **Bulk Upload**: Allow multiple files at once
4. **File Preview**: Generate thumbnails for images/PDFs
5. **Access Control**: Set different permissions per document
6. **Version Control**: Keep document history
7. **Search**: Add document search functionality
