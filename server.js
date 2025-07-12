const express = require("express");
const cors = require("cors");
const multer = require("multer");
const axios = require("axios");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.static("public"));

const upload = multer({ storage: multer.memoryStorage() });

const replicateHeaders = {
  Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`,
  "Content-Type": "application/json",
};

// Helper to upload image to temporary hosting (Imgur alternative)
async function uploadToImgBB(buffer) {
  const base64Image = buffer.toString("base64");
  const response = await axios.post("https://api.imgbb.com/1/upload", null, {
    params: {
      key: "a_free_imgbb_api_key_here", // optional — or use any image hosting
      image: base64Image,
    },
  });
  return response.data.data.url;
}

async function runReplicateModel(model, input) {
  const response = await axios.post(
    `https://api.replicate.com/v1/predictions`,
    {
      version: model.version,
      input: input,
    },
    { headers: replicateHeaders }
  );
  return response.data;
}

app.post("/enhance", upload.single("image"), async (req, res) => {
  try {
    const modelType = req.body.model || "realesrgan";
    const imageBuffer = req.file.buffer;

    const imageUrl = await uploadToImgBB(imageBuffer);

    let model = {};
    let input = { image: imageUrl };

    if (modelType === "realesrgan") {
      model.version = "9280f152c78d469c8b5f10ed60d74b6e163c5b9a5c9b9028a4cba9f45b52b7fd";
    } else if (modelType === "gfpgan") {
      model.version = "d65acfc0486e6e6613e3f263b8b37d6f8d50f3547b04dce4504ceecb6b84c19a";
    }

    const output = await runReplicateModel(model, input);

    res.json({ status: "success", output });
  } catch (error) {
    console.error("Enhance error:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
});

app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
});
