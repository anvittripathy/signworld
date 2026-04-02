export default async function handler(req, res) {
  try {
    console.log("API HIT");

    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      console.error("Missing API key");
      return res.status(500).json({ error: "API key missing" });
    }

    return res.status(200).json({ message: "API working" });

  } catch (err) {
    console.error("ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
}
