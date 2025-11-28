const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const Video = require('../models/video');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Cloudinary storage for videos
const videoStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'videos',
    resource_type: 'video',
    allowed_formats: ['mp4', 'webm', 'ogg'],
    transformation: [
      { quality: 'auto' },
      { fetch_format: 'auto' }
    ]
  },
});

// Configure Cloudinary storage for thumbnails
const thumbnailStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'thumbnails',
    resource_type: 'image',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [
      { width: 500, height: 300, crop: 'fill' },
      { quality: 'auto' },
      { fetch_format: 'auto' }
    ]
  },
});

// File filter for accepted file types
const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'video') {
    const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/ogg'];
    if (allowedVideoTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed (MP4, WebM, OGG)'), false);
    }
  } else if (file.fieldname === 'thumbnail') {
    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedImageTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (JPEG, PNG, GIF, WEBP)'), false);
    }
  }
};

// Create separate multer instances for different file types
const uploadVideo = multer({
  storage: videoStorage,
  fileFilter,
  limits: { 
    fileSize: 100 * 1024 * 1024 // 100MB limit for videos
  }
}).single('video');

const uploadThumbnail = multer({
  storage: thumbnailStorage,
  fileFilter,
  limits: { 
    fileSize: 5 * 1024 * 1024 // 5MB limit for thumbnails
  }
}).single('thumbnail');

// Combined upload for both video and thumbnail
const upload = multer({
  fileFilter,
  limits: { 
    fileSize: 100 * 1024 * 1024 // 100MB limit
  }
}).fields([
  { name: 'video', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 }
]);

// Helper function to upload file to appropriate Cloudinary folder
const uploadToCloudinary = (file, resourceType = 'auto') => {
  return new Promise((resolve, reject) => {
    const uploadOptions = {
      resource_type: resourceType,
      folder: resourceType === 'video' ? 'videos' : 'thumbnails',
    };

    if (resourceType === 'image') {
      uploadOptions.transformation = [
        { width: 500, height: 300, crop: 'fill' },
        { quality: 'auto' },
        { fetch_format: 'auto' }
      ];
    } else if (resourceType === 'video') {
      uploadOptions.transformation = [
        { quality: 'auto' },
        { fetch_format: 'auto' }
      ];
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    uploadStream.end(file.buffer);
  });
};

module.exports = {
  upload_video: async (req, res) => {
    try {
      // Use multer with memory storage for processing
      await new Promise((resolve, reject) => {
        const memoryUpload = multer({ 
          storage: multer.memoryStorage(),
          fileFilter,
          limits: { fileSize: 100 * 1024 * 1024 }
        }).fields([
          { name: 'video', maxCount: 1 },
          { name: 'thumbnail', maxCount: 1 }
        ]);

        memoryUpload(req, res, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      const { title, description, genre } = req.body;
      
      if (!req.files || !req.files.video) {
        return res.status(400).json({ message: 'No video file uploaded' });
      }

      // Upload video to Cloudinary
      const videoResult = await uploadToCloudinary(req.files.video[0], 'video');
      
      const videoData = {
        title,
        description,
        genre,
        videoUrl: videoResult.secure_url,
        cloudinaryVideoId: videoResult.public_id
      };

      // Upload thumbnail if provided
      if (req.files.thumbnail) {
        const thumbnailResult = await uploadToCloudinary(req.files.thumbnail[0], 'image');
        videoData.thumbnailUrl = thumbnailResult.secure_url;
        videoData.cloudinaryThumbnailId = thumbnailResult.public_id;
      }

      const video = await Video.create(videoData);

      res.status(201).json({ 
        message: 'Video uploaded successfully',
        video 
      });
    } catch (error) {
      console.error('Error uploading video:', error);
      res.status(500).json({ 
        message: 'Error uploading video',
        error: error.message 
      });
    }
  },

  edit_video: async (req, res) => {
    try {
      const { id } = req.params;
      
      const video = await Video.findByPk(id);
      if (!video) {
        return res.status(404).json({ message: 'Video not found' });
      }

      // Process file upload if there is one
      if (req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data')) {
        await new Promise((resolve, reject) => {
          const memoryUpload = multer({ 
            storage: multer.memoryStorage(),
            fileFilter,
            limits: { fileSize: 100 * 1024 * 1024 }
          }).fields([
            { name: 'video', maxCount: 1 },
            { name: 'thumbnail', maxCount: 1 }
          ]);

          memoryUpload(req, res, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      }
      
      const { title, description, genre, videoUrl, thumbnailUrl } = req.body;

      // Update video file if new one was uploaded
      if (req.files && req.files.video) {
        // Delete old video from Cloudinary if it exists
        if (video.cloudinaryVideoId) {
          try {
            await cloudinary.uploader.destroy(video.cloudinaryVideoId, { resource_type: 'video' });
          } catch (deleteError) {
            console.error('Error deleting old video from Cloudinary:', deleteError);
          }
        }
        
        // Upload new video
        const videoResult = await uploadToCloudinary(req.files.video[0], 'video');
        video.videoUrl = videoResult.secure_url;
        video.cloudinaryVideoId = videoResult.public_id;
      } else if (videoUrl) {
        video.videoUrl = videoUrl;
      }

      // Update thumbnail if new one was uploaded
      if (req.files && req.files.thumbnail) {
        // Delete old thumbnail from Cloudinary if it exists
        if (video.cloudinaryThumbnailId) {
          try {
            await cloudinary.uploader.destroy(video.cloudinaryThumbnailId, { resource_type: 'image' });
          } catch (deleteError) {
            console.error('Error deleting old thumbnail from Cloudinary:', deleteError);
          }
        }
        
        // Upload new thumbnail
        const thumbnailResult = await uploadToCloudinary(req.files.thumbnail[0], 'image');
        video.thumbnailUrl = thumbnailResult.secure_url;
        video.cloudinaryThumbnailId = thumbnailResult.public_id;
      } else if (thumbnailUrl) {
        video.thumbnailUrl = thumbnailUrl;
      }

      // Update other fields
      if (title) video.title = title;
      if (description) video.description = description;
      if (genre) video.genre = genre;

      await video.save();

      res.status(200).json({
        message: 'Video updated successfully',
        video
      });
    } catch (error) {
      console.error('Error in edit_video:', error);
      res.status(500).json({
        message: 'Error updating video',
        error: error.message
      });
    }
  },

  display_videos: async (req, res) => {
    try {
      const videos = await Video.findAll();
      res.status(200).json({ videos });
    } catch (error) {
      res.status(500).json({
        message: 'Error fetching videos',
        error: error.message
      });
    }
  },
  
  delete_video: async (req, res) => {
    try {
      const { id } = req.params;

      const video = await Video.findByPk(id);
      if (!video) {
        return res.status(404).json({ message: 'Video not found' });
      }

      // Delete video file from Cloudinary
      if (video.cloudinaryVideoId) {
        try {
          await cloudinary.uploader.destroy(video.cloudinaryVideoId, { resource_type: 'video' });
        } catch (deleteError) {
          console.error('Error deleting video from Cloudinary:', deleteError);
        }
      }

      // Delete thumbnail file from Cloudinary if it exists
      if (video.cloudinaryThumbnailId) {
        try {
          await cloudinary.uploader.destroy(video.cloudinaryThumbnailId, { resource_type: 'image' });
        } catch (deleteError) {
          console.error('Error deleting thumbnail from Cloudinary:', deleteError);
        }
      }

      // Delete video record from database
      await video.destroy();

      res.status(200).json({
        message: 'Video deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting video:', error);
      res.status(500).json({
        message: 'Error deleting video',
        error: error.message
      });
    }
  }
};