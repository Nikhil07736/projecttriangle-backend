const express = require("express");
const fs = require("fs/promises");
const path = require("path");
const PDFDocument = require("pdfkit");
const PptxGenJS = require("pptxgenjs");

const router = express.Router();

// ------------------ Gemini AI Call ------------------
async function callGemini(prompt) {
  try {
    const model = "models/gemini-2.5-pro";
    const url = `https://generativelanguage.googleapis.com/v1/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;
    const body = { contents: [{ role: "user", parts: [{ text: prompt }] }] };

    console.log("Calling Gemini REST API...");
    const apiResponse = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const responseData = await apiResponse.json();
    if (!apiResponse.ok) {
      const errorMessage = responseData?.error?.message || "Unknown API error";
      throw new Error(`Gemini API request failed: ${errorMessage}`);
    }

    const text = responseData?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("Could not extract text from Gemini API response.");

    console.log("✅ Successfully received response from Gemini API.");
    return text;
  } catch (err) {
    console.error("❌ Error in callGemini function:", err);
    throw err;
  }
}

// ------------------ Image Fetching Service ------------------
async function fetchImage(query) {
    if (!process.env.PEXELS_API_KEY || process.env.PEXELS_API_KEY === 'your_pexels_api_key_here') {
        console.warn("⚠ PEXELS_API_KEY not found. Skipping image generation.");
        return null;
    }
    try {
        console.log(`Fetching image for query: "${query}"`);
        const response = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1`, {
            headers: { Authorization: process.env.PEXELS_API_KEY },
        });
        if (!response.ok) throw new Error('Pexels API request failed.');
        const data = await response.json();
        const imageUrl = data.photos?.[0]?.src?.medium;
        if (imageUrl) {
            console.log(`✅ Found image: ${imageUrl}`);
            const imageResponse = await fetch(imageUrl);
            const arrayBuffer = await imageResponse.arrayBuffer();
            return Buffer.from(arrayBuffer).toString('base64');
        }
        console.warn(`⚠ No image found for query: "${query}"`);
        return null;
    } catch (err) {
        console.error("❌ Error fetching image from Pexels:", err);
        return null;
    }
}

// ------------------ Slide Parsing & PPTX Generation ------------------
function parseSlidesWithNotes(text) {
  const slideSections = text.split(/Slide \d+:/).filter(section => section.trim().length > 0);
  if (slideSections.length === 0) return [];
  return slideSections.map((section, index) => {
    const [contentPart, notesPart] = section.split('--- Speaker Notes ---');
    const lines = contentPart.trim().split('\n').filter(line => line.trim().length > 0);
    let imageQuery = null;
    const imageQueryIndex = lines.findIndex(line => line.includes('[Image Query:'));
    if (imageQueryIndex !== -1) {
        const match = lines[imageQueryIndex].match(/\[Image Query: (.*?)\]/);
        if (match && match[1]) imageQuery = match[1].trim();
        lines.splice(imageQueryIndex, 1);
    }
    const title = lines.shift()?.replace(/[*#-]/g, '').trim() || `Slide ${index + 1}`;
    const content = lines.map(line => line.replace(/[*#-]/g, '').trim()).filter(line => line.length > 0);
    const speakerNotes = notesPart ? notesPart.trim() : "No speaker notes provided.";
    return { title, content, speakerNotes, imageQuery };
  });
}

async function generatePPTXBuffer(slides) {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.defineSlideMaster({
    title: 'MASTER_SLIDE',
    background: { color: 'FFFFFF' },
    objects: [
      { rect: { x: 0, y: '92%', w: '100%', h: 0.75, fill: { color: '0072C6' } } },
      { text: { text: 'Project Triangle ©', options: { x: 0.5, y: '93%', w:'90%', align:'right', color: 'FFFFFF', fontSize: 10 } } },
    ],
  });

  if (!slides || slides.length === 0) {
    const errorSlide = pptx.addSlide({ masterName: 'MASTER_SLIDE' });
    errorSlide.addText('Generation Error', { x: '5%', y: '35%', w: '90%', fontSize: 32, bold: true, align: 'center', color: 'FF0000' });
    errorSlide.addText('Could not generate presentation. The AI response may have been empty or in an unexpected format.', { x: '5%', y: '50%', w: '90%', fontSize: 18, align: 'center', color: '363636' });
    return pptx.write("nodebuffer");
  }

  for (const s of slides) {
      const slide = pptx.addSlide({ masterName: 'MASTER_SLIDE' });
      const titleColor = slides.indexOf(s) === 0 ? '0072C6' : '363636';
      slide.addText(s.title, { x: 0.5, y: 0.25, w: '90%', h: 1, fontSize: 32, bold: true, color: titleColor });
      let imageBase64 = s.imageQuery ? await fetchImage(s.imageQuery) : null;
      const textOptions = { x: 0.5, y: 1.5, w: imageBase64 ? '55%' : '90%', h: '75%', fontSize: 20, bullet: true, paraSpaceAfter: 10 };
      if (s.content.length > 0) slide.addText(s.content.join('\n'), textOptions);
      if (imageBase64) slide.addImage({ data: `data:image/png;base64,${imageBase64}`, x: '65%', y: 1.5, w: '30%', h: '60%' });
      if (s.speakerNotes) slide.addNotes(s.speakerNotes);
  }
  return pptx.write("nodebuffer");
}

// ------------------ ENHANCED PDF Generation ------------------
function generatePDFBuffer(text, title) {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ bufferPages: true, layout: 'portrait', size: 'A4', margins: { top: 50, bottom: 50, left: 72, right: 72 } });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));

    // PDF Title
    doc.font('Helvetica-Bold').fontSize(20).text(title, { align: 'center' });
    doc.moveDown(2);

    // Process each line of the generated text for professional styling
    const lines = text.split('\n');
    lines.forEach(line => {
        if (line.startsWith('## ')) {
            doc.moveDown().font('Helvetica-Bold').fontSize(16).fillColor('black').text(line.substring(3), { paragraphGap: 5 });
        } else if (line.startsWith('### ')) {
            doc.moveDown().font('Helvetica-Bold').fontSize(14).fillColor('black').text(line.substring(4), { paragraphGap: 5 });
        } else if (line.startsWith('* ')) {
            doc.font('Helvetica').fontSize(12).fillColor('black').text(`• ${line.substring(2)}`, { continued: false, indent: 20, paragraphGap: 5 });
        } else if (line.trim().length > 0) {
            doc.font('Helvetica').fontSize(12).fillColor('black').text(line, { align: 'left', paragraphGap: 5 });
        }
    });
    
    doc.end();
  });
}


// ------------------ UPDATED /generate Route ------------------
router.post("/generate", async (req, res) => {
  console.log("\n--- Received request for /api/ai/generate ---");
  try {
    const { docType, title, description = "", techStack = [] } = req.body;
    if (!docType || !title) return res.status(400).json({ error: "docType and title are required." });

    const isPresentation = docType === "ppt";
    const isPDF = ["abstract", "blackbook", "literatureSurvey"].includes(docType);

    const techStackString = techStack.length > 0 ? techStack.join(", ") : 'Not specified';
    let prompt = "";

    // --- PROMPTS ---
    if (docType === "abstract") {
      prompt = `You are a professional technical writer. Generate a single-paragraph, investor-ready abstract based on the project context below. The abstract must be between 150-220 words.
PROJECT CONTEXT:
- Project Name: "${title}"
- Description: "${description}"
- Technology Stack: ${techStackString}`;

    } else if (docType === "blackbook") {
      prompt = `You are a principal software architect. Generate a premium, investor-grade project blackbook based on the context below. Use strict Markdown format (## for headings, * for bullets).
REQUIRED SECTIONS:
- ## Abstract
- ## System Architecture
- ## Setup & Installation
- ## How to Run the Project
- ## Future Work
PROJECT CONTEXT:
- Project Name: "${title}"
- Description: "${description}"
- Technology Stack: ${techStackString}`;

    } else if (docType === "literatureSurvey") { // New PDF-focused prompt
      prompt = `You are a software engineering researcher. Prepare a formal literature survey as a structured document based on the project context below. Use Markdown format (## for headings, * for bullets).
REQUIRED SECTIONS:
- ## Introduction (Introduce the problem domain of "${title}")
- ## Analysis of Existing Systems (Analyze 3-5 competing systems, detailing their pros and cons in bullet points)
- ## Research Gap (Identify what the existing systems are missing)
- ## Conclusion & Justification (Conclude why "${title}" is necessary and an improvement)
PROJECT CONTEXT:
- Project Name: "${title}"
- Description: "${description}"`;

    } else if (docType === "ppt") {
        const slideCount = 7;
        const slideStructure = `
- Slide 1: Project Title and a compelling tagline.
- Slide 2: The Problem (Based on the project description).
- Slide 3: Our Solution (Detailing the project's features).
- Slide 4: Core Technology (Discussing the tech stack).
- Slide 5: Why We Are Superior (Unique selling points).
- Slide 6: Business Value & Target Audience.
- Slide 7: Next Steps / Call to Action.`;
        prompt = `You are a senior business analyst creating a pitch deck.
MUST FOLLOW ALL INSTRUCTIONS:
1. Generate exactly ${slideCount} slides based on the provided project context.
2. Format each slide starting with "Slide N:".
3. For each slide, provide speaker notes separated by "--- Speaker Notes ---".
4. For each slide, suggest a relevant image with the format: [Image Query: simple search term].
SLIDE STRUCTURE:${slideStructure}
PROJECT CONTEXT:
- Project Name: "${title}"
- Description: "${description}"
- Technology Stack: ${techStackString}`;
    } else {
        return res.status(400).json({ error: "Unsupported docType." });
    }

    // --- PROCESSING ---
    const generatedText = await callGemini(prompt);
    const uploadsDir = path.join(__dirname, "..", "uploads", "generated");
    await fs.mkdir(uploadsDir, { recursive: true });
    
    const safeBase = title.toLowerCase().replace(/[^a-z0-9\-]+/g, "-").slice(0, 40);
    let filename, filepath, publicUrl;

    if (isPresentation) {
      const slides = parseSlidesWithNotes(generatedText);
      const pptBuffer = await generatePPTXBuffer(slides);
      filename = `${safeBase}-${docType}-${Date.now()}.pptx`;
      filepath = path.join(uploadsDir, filename);
      await fs.writeFile(filepath, pptBuffer);
      publicUrl = `/uploads/generated/${filename}`;
      return res.json({ documentURL: publicUrl, text: "PPTX file generated directly." });

    } else if (isPDF) {
      const pdfBuffer = await generatePDFBuffer(generatedText, title);
      filename = `${safeBase}-${docType}-${Date.now()}.pdf`;
      filepath = path.join(uploadsDir, filename);
      await fs.writeFile(filepath, pdfBuffer);
      publicUrl = `/uploads/generated/${filename}`;
      // Even though we create a PDF, we still send the raw text back for the "View" button
      return res.json({ documentURL: publicUrl, text: generatedText });
    }

  } catch (err) {
    console.error("❌ Error in /generate route:", err.message);
    return res.status(500).json({ error: "Generation failed." });
  }
});


// ------------------ /convert Route (Remains for format-shifting) ------------------
router.post("/convert", async (req, res) => {
    // This route is no longer primary, but is kept for allowing users
    // to download a PPT version of a Black Book, for example.
    const { fileUrl, format, docType, title } = req.body;
    if (!fileUrl || !format) return res.status(400).json({ error: "fileUrl and format are required" });

    const localPath = path.join(__dirname, '..', fileUrl);
    const text = await fs.readFile(localPath, 'utf8');

    if (format.toLowerCase() === 'ppt') {
        let slides;
        if (docType === 'abstract') {
            slides = [{ title: title, content: [text] }];
        } else {
            // Basic markdown parsing for blackbook/literature survey
            const sections = text.split(/\n## /);
            slides = sections.map(section => {
                const lines = section.trim().split('\n');
                const slideTitle = lines.shift().replace(/#/g, '').trim();
                const content = lines.map(l => l.replace(/[*#-]/g, '').trim()).filter(l => l);
                return { title: slideTitle, content: content };
            });
        }
        const pptBuffer = await generatePPTXBuffer(slides);
        res.setHeader("Content-Disposition", `attachment; filename=${title || docType}.pptx`);
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.presentationml.presentation");
        return res.send(pptBuffer);
    }
     return res.status(400).json({ error: "Invalid format for conversion." });
});

module.exports = router;