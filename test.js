import 'dotenv/config';

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("Error: GEMINI_API_KEY is not defined in your .env file!");
  process.exit(1);
}

console.log("Testing Gemini API Key: " + apiKey.substring(0, 6) + "...");

async function testGemini() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  const payload = {
    contents: [{
      role: 'user',
      parts: [{
        text: 'Respond with "Gemini is online and working!"'
      }]
    }]
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    console.log("\nSuccess! Response from Gemini:");
    console.log(text ? text.trim() : "Empty response received.");
  } catch (error) {
    console.error("\nFailed to connect to Gemini API:", error.message);
  }
}

testGemini();
