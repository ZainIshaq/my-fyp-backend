// const User = require("../models/user");
// const Video = require('../models/video');
// module.exports ={
//     Videostodisplay: async (req, res)=>{
//         try {
//             const videos = await Video.findAll({
//               attributes: ['id', 'thumbnailUrl', 'title', 'genre', 'description', 'videoUrl']
//             });
      
//             res.status(200).json({ videos });
//           } catch (error) {
//             console.error('Error fetching videos:', error);
//             res.status(500).json({ message: "Internal Server Error" });
//           }
//     }
// }

const User = require("../models/user");
const Video = require('../models/video');

module.exports = {
    Videostodisplay: async (req, res) => {
        try {
            const videos = await Video.findAll({
                attributes: [
                    'id', 
                    'thumbnailUrl', 
                    'title', 
                    'genre', 
                    'description', 
                    'videoUrl',
                    'cloudinaryVideoId',
                    'cloudinaryThumbnailId',
                    'createdAt',
                    'updatedAt'
                ]
            });

            res.status(200).json({ videos });
        } catch (error) {
            console.error('Error fetching videos:', error);
            res.status(500).json({ message: "Internal Server Error" });
        }
    }
};