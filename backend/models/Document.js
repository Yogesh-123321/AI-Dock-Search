const mongoose = require("mongoose");

const DocumentSchema = new mongoose.Schema(
  {
    title: String,
    content: String,
    filePath: String,

    // NEW FIELD
    embedding: {
      type: [Number],
      default: []
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Document", DocumentSchema);
