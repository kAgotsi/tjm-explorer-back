require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const serverless = require("serverless-http");

const app = express();
app.use(cors());
app.use(express.json());

// Ensure environment variables are loaded correctly
const CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
const CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI || "http://localhost:3000/callback"; // Use environment variable fallback

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("LinkedIn credentials are missing in environment variables");
  process.exit(1); // Exit with error if credentials are missing
}

// Route to exchange OAuth2 code for an access token
app.post("/auth/linkedin", async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: "Code LinkedIn manquant" });

  try {
    // Exchange code for access token
    const tokenResponse = await axios.post("https://www.linkedin.com/oauth/v2/accessToken", null, {
      params: {
        grant_type: "authorization_code",
        code,
        redirect_uri: REDIRECT_URI,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
      },
    });

    const accessToken = tokenResponse.data.access_token;

    // Fetch LinkedIn profile data
    const profileResponse = await axios.get("https://api.linkedin.com/v2/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    // Fetch LinkedIn experiences
    const experienceResponse = await axios.get("https://api.linkedin.com/v2/experience", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const experiences = experienceResponse.data.elements || [];

    if (experiences.length === 0) {
      return res.json({ profile: profileResponse.data, message: "Aucune expérience trouvée." });
    }

    // Check last job (Permanent or Freelance)
    const lastJob = experiences[0];

    let requiresTJM = false;
    if (lastJob.contractType !== "CDI") {
      requiresTJM = true;
    }

    // Send profile and experience details
    res.json({
      profile: profileResponse.data,
      experiences,
      requiresTJM,
    });
  } catch (error) {
    console.error("Error during OAuth LinkedIn:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed LinkedIn authentication" });
  }
});

// Export the app directly as the serverless handler
module.exports = serverless(app);
