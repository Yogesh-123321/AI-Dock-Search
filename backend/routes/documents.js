const express = require("express");
const Document = require("../models/Document");
const router = express.Router();

const axios = require("axios");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const fs = require("fs/promises");
const path = require("path");

const cloudinary = require("../cloudinary");

// Multer temporary local storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) =>
    cb(null, Date.now() + "-" + file.originalname)
});

const upload = multer({ storage });

// Embedding
async function generateEmbedding(text) {
  try {
    const response = await axios.post(
      "https://openrouter.ai/api/v1/embeddings",
      {
        model: "openai/text-embedding-3-small",
        input: text
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    return response.data.data[0].embedding;
  } catch (err) {
    console.error("Embedding error:", err?.response?.data || err.message);
    return [];
  }
}

function cosineSimilarity(a, b) {
  const dot = a.reduce((sum, value, i) => sum + value * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, value) => sum + value * value, 0));
  const magB = Math.sqrt(b.reduce((sum, value) => sum + value * value, 0));

  if (!magA || !magB) return 0;
  return dot / (magA * magB);
}

// Add manual document
router.post("/add", async (req, res) => {
  try {
    const { title, content } = req.body;
    const embedding = await generateEmbedding(content);

    const doc = new Document({ title, content, embedding });
    await doc.save();

    res.json({ message: "Document saved", doc });
  } catch {
    res.status(500).json({ error: "Something went wrong" });
  }
});

// Basic search
router.get("/search", async (req, res) => {
  try {
    const { q } = req.query;

    const docs = await Document.find({
      $or: [
        { title: { $regex: q, $options: "i" } },
        { content: { $regex: q, $options: "i" } }
      ]
    });

    res.json(docs);
  } catch {
    res.status(500).json({ error: "Search failed" });
  }
});

// AI vector search
router.get("/ai-search", async (req, res) => {
  try {
    const { q } = req.query;

    const queryEmbedding = await generateEmbedding(q);
    const docs = await Document.find();

    const scored = docs
      .map(doc => ({
        _id: doc._id,
        title: doc.title,
        content: doc.content,
        filePath: doc.filePath,
        score: cosineSimilarity(queryEmbedding, doc.embedding)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    res.json(scored);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "AI search failed" });
  }
});

// File upload with Cloudinary + public preset
router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const filePath = req.file.path;
    const ext = path.extname(req.file.originalname).toLowerCase();

    let extractedText = "";

    if (ext === ".pdf") {
      const data = await pdfParse(await fs.readFile(filePath));
      extractedText = data.text;
    } else if (ext === ".docx") {
      const data = await mammoth.extractRawText({ path: filePath });
      extractedText = data.value;
    } else {
      return res.status(400).json({ error: "Only PDF and DOCX supported" });
    }

    // Upload using public preset
    const uploaded = await cloudinary.uploader.upload(filePath, {
      upload_preset: "public_raw" ,
      resource_type: "raw"
    });

    // Cleanup temp file
    try {
      await fs.unlink(filePath);
    } catch (err) {
      console.log("Temp file cleanup failed:", err.message);
    }

    const embedding = await generateEmbedding(extractedText);

    const doc = new Document({
      title: req.file.originalname,
      content: extractedText,
      filePath: uploaded.secure_url,
      embedding
    });

    await doc.save();

    res.json({ message: "File uploaded and saved", doc });
  } catch (err) {
    console.log("UPLOAD ERROR:", err);
    res.status(500).json({ error: "Upload failed" });
  }
});

// All docs
router.get("/all", async (req, res) => {
  const docs = await Document.find();
  res.json(docs);
});

// Delete
router.delete("/:id", async (req, res) => {
  try {
    await Document.findByIdAndDelete(req.params.id);
    res.json({ message: "Document deleted" });
  } catch {
    res.status(500).json({ error: "Delete failed" });
  }
});

module.exports = router;
