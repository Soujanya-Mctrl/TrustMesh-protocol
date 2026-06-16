import { GoogleGenerativeAI } from "@google/generative-ai";

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY is not set.");
    return;
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  
  console.log("Listing models for API Key...");
  try {
    // Note: The JS SDK doesn't expose listModels directly on the main class in some versions,
    // but we can query it or inspect the models. Let's see if we can use the REST API via fetch.
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const res = await fetch(url);
    const data = await res.json() as any;
    
    if (data.error) {
      console.error("Error from API:", data.error);
    } else {
      console.log("Supported Models:");
      for (const m of data.models || []) {
        console.log(`- ${m.name} (methods: ${m.supportedGenerationMethods.join(", ")})`);
      }
    }
  } catch (err: any) {
    console.error("Failed to fetch models:", err.message);
  }
}

main().catch(console.error);
