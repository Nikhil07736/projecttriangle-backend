// backend/scripts/list_models.js
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function main(){
  if(!process.env.GEMINI_API_KEY){
    console.error('Missing GEMINI_API_KEY in .env');
    process.exit(1);
  }

  // initialize SDK
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

  try {
    console.log('Calling listModels()...');
    const res = await genAI.listModels();
    // print a readable summary
    console.log('Full listModels() result:\n', JSON.stringify(res, null, 2));
    // If the SDK returns an array under res.models or similar, print a compact list:
    if (Array.isArray(res.models)) {
      console.log('\nCompact list (name + possible supported fields):');
      res.models.forEach(m => {
        console.log('-', m.name || m.model || m.id);
        if (m.supportedMethods) console.log('  supportedMethods:', m.supportedMethods);
        if (m.supportedGenerationMethods) console.log('  supportedGenerationMethods:', m.supportedGenerationMethods);
      });
    }
    process.exit(0);
  } catch (err) {
    console.error('listModels() error:', err);
    process.exit(2);
  }
}

main();
