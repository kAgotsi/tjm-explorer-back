require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
const CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;
const REDIRECT_URI = "http://localhost:3000/callback"; // Ajoutez cette URL dans LinkedIn

// Route pour échanger le code OAuth2 contre un access_token
app.post("/auth/linkedin", async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: "Code LinkedIn manquant" });

  try {
    // 1️⃣ Échanger le code contre un access_token
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

    // 2️⃣ Récupérer les données du profil LinkedIn
    const profileResponse = await axios.get("https://api.linkedin.com/v2/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    // 3️⃣ Récupérer les expériences professionnelles
    const experienceResponse = await axios.get(
      "https://api.linkedin.com/v2/experience",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const experiences = experienceResponse.data.elements || [];

    if (experiences.length === 0) {
      return res.json({ profile: profileResponse.data, message: "Aucune expérience trouvée." });
    }

    // 4️⃣ Vérifier le dernier poste (CDI ou Freelance)
    const lastJob = experiences[0]; // Supposons trié du plus récent au plus ancien

    let requiresTJM = false;
    if (lastJob.contractType !== "CDI") {
      requiresTJM = true;
    }

    res.json({
      profile: profileResponse.data,
      experiences,
      requiresTJM,
    });
  } catch (error) {
    console.error("Erreur OAuth LinkedIn:", error.response?.data || error.message);
    res.status(500).json({ error: "Échec de l'authentification LinkedIn" });
  }
});

app.listen(5000, () => console.log("🚀 Serveur lancé sur http://localhost:5000"));
