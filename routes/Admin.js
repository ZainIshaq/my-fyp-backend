const express = require("express");
const router = express.Router();
const { upload_video, edit_video, display_videos,  delete_video } = require('../controllers/Admin_video');

// Route to upload a video
router.post('/uploadVideo', upload_video);

// Route to edit a video by ID
router.put('/editVideo/:id', edit_video);

// Route to fetch all videos
router.get('/allVideos', display_videos);

router.delete('/videos/:id', delete_video);

module.exports = router;
