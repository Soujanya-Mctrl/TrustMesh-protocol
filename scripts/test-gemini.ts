import { GoogleGenerativeAI } from "@google/generative-ai";

async function testModel(modelName: string, apiKey: string) {
  console.log(`Testing model: ${modelName}...`);
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent("Say hello!");
    console.log(`  ✓ Success: "${result.response.text().trim()}"\n`);
    return true;
  } catch (err: any) {
    console.log(`  ✗ Failed: ${err.message}\n`);
    return false;
  }
}

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY is not set.");
    return;
  }

  const models = ["gemini-2.0-flash", "gemini-2.5-flash", "gemini-flash-latest"];
  for (const m of models) {
    await testModel(m, apiKey);
  }
}

main().catch(console.error);
