require("dotenv").config();
const sequelize = require("./config/database");
const Video = require("./models/Video");
const { cloudFrontDomain } = require("./config/aws");

// Helper function to format CloudFront URL
const getCloudFrontUrl = (key) => {
  const cleanKey = key.replace(/^\/+/, "");
  const cleanDomain = cloudFrontDomain.replace(/^https?:\/\//, "");
  return `https://${cleanDomain}/${cleanKey}`;
};

async function fixCloudFrontUrls() {
  try {
    await sequelize.authenticate();
    console.log("Database connection established");

    const videos = await Video.findAll();
    console.log(`Found ${videos.length} videos to check`);

    for (const video of videos) {
      const correctUrl = getCloudFrontUrl(video.s3Key);
      if (video.cloudFrontUrl !== correctUrl) {
        console.log(`Fixing URL for video ${video.title}:`);
        console.log(`Old URL: ${video.cloudFrontUrl}`);
        console.log(`New URL: ${correctUrl}`);

        await video.update({ cloudFrontUrl: correctUrl });
        console.log("Updated successfully");
      }
    }

    console.log("All URLs have been checked and fixed");
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await sequelize.close();
  }
}

fixCloudFrontUrls();
