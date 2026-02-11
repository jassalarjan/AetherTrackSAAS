# Cloudinary Setup Guide for Document Upload

This guide will help you set up Cloudinary for document uploads in the Project Details page.

## Quick Setup Steps

### 1. Create a Cloudinary Account
1. Go to [Cloudinary](https://cloudinary.com/)
2. Sign up for a free account (or log in if you already have one)
3. Navigate to your Dashboard

### 2. Get Your Credentials
From your Cloudinary Dashboard, you'll need:
- **Cloud Name**: Found at the top of your dashboard
- **Upload Preset**: You'll create this in the next step

### 3. Create an Upload Preset
1. In your Cloudinary Dashboard, go to **Settings** → **Upload**
2. Scroll down to **Upload presets**
3. Click **Add upload preset**
4. Configure the preset:
   - **Preset name**: `ml_default` (or choose your own)
   - **Signing Mode**: Select **Unsigned** (for client-side uploads)
   - **Folder**: (optional) Specify a folder like `aethertrack/documents`
   - **Access Mode**: Public (or Authenticated if you prefer)
5. Click **Save**

### 4. Configure Your Application

#### Option A: Using .env file (Recommended)
1. Copy `.env.example` to `.env` in the `frontend` directory:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your Cloudinary credentials:
   ```
   VITE_CLOUDINARY_CLOUD_NAME=your_actual_cloud_name
   VITE_CLOUDINARY_UPLOAD_PRESET=ml_default
   ```

#### Option B: Direct Configuration
If you don't want to use environment variables, you can directly edit the code in `ProjectDetail.jsx`:
- Find line with: `${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'YOUR_CLOUD_NAME'}`
- Replace `YOUR_CLOUD_NAME` with your actual cloud name

### 5. Test the Upload
1. Restart your development server (if running)
2. Navigate to any project details page
3. Go to the **Documents** tab
4. Click **Upload Document**
5. Select a file and upload

## Supported File Types

Cloudinary automatically handles various file types:
- **Documents**: PDF, DOC, DOCX, TXT, RTF
- **Spreadsheets**: XLS, XLSX, CSV
- **Presentations**: PPT, PPTX
- **Images**: JPG, PNG, GIF, SVG, WebP
- **Archives**: ZIP, RAR
- **And more...**

## Security Considerations

### For Production:
1. **Use Signed Uploads**: Change your upload preset to "Signed" mode
2. **Backend Proxy**: Route uploads through your backend for better security
3. **Access Control**: Use authenticated delivery for sensitive documents
4. **Implement Virus Scanning**: Enable Cloudinary's virus scanning add-on

### Example Secure Setup:
```javascript
// In your backend (e.g., backend/routes/projects.js)
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Upload endpoint
router.post('/:id/upload-document', authenticate, async (req, res) => {
  try {
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'aethertrack/documents',
      resource_type: 'auto'
    });
    
    // Save to database
    const project = await Project.findById(req.params.id);
    project.documents.push({
      name: req.body.name || req.file.originalname,
      url: result.secure_url,
      type: req.file.mimetype,
      size: req.file.size,
      uploadedBy: req.user.userId
    });
    await project.save();
    
    res.json({ success: true, document: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## Troubleshooting

### Upload Fails with CORS Error
- Make sure your upload preset is set to "Unsigned"
- Check that your cloud name is correct

### File Size Limits
- Free tier: 10MB per file
- Upgrade for larger files

### Invalid Credentials
- Double-check your cloud name (it's case-sensitive)
- Ensure upload preset name matches exactly

## Free Tier Limits
- **Storage**: 25GB
- **Bandwidth**: 25GB/month
- **Transformations**: 25,000/month
- **File Size**: 10MB max per file

For most small to medium projects, this is more than sufficient!

## Additional Resources
- [Cloudinary Documentation](https://cloudinary.com/documentation)
- [Upload Widget](https://cloudinary.com/documentation/upload_widget)
- [Signed Uploads Guide](https://cloudinary.com/documentation/upload_images#signed_uploads)
