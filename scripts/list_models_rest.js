// backend/scripts/list_models_rest.js
require("dotenv").config();

async function main() {
  if (!process.env.GEMINI_API_KEY) {
    console.error("Missing GEMINI_API_KEY in .env");
    process.exit(1);
  }

  const url = `https://generativelanguage.googleapis.com/v1/models?key=${process.env.GEMINI_API_KEY}`;
  console.log("GET", url);

  try {
    const res = await fetch(url); // Node 18+ supports global fetch
    const text = await res.text();
    console.log("Status:", res.status);
    console.log("Raw body:", text);
  } catch (err) {
    console.error("REST listModels failed:", err);
  }
}

main();
