export async function GET() {
  return Response.json({ status: "Hugging Face API Route is active. Use POST to interact." });
}

export async function POST(req) {
  try {
    const { text } = await req.json();

    if (!text) {
      return Response.json({ error: "Text is required" }, { status: 400 });
    }

    const token = process.env.HUGGINGFACE_API_KEY;
    
    if (!token) {
      return Response.json({ error: "Hugging Face API Key is not configured in .env" }, { status: 500 });
    }

    const response = await fetch(
      "https://api-inference.huggingface.co/models/distilbert-base-uncased",
      {
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        method: "POST",
        body: JSON.stringify({ inputs: text }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return Response.json(
        { error: "Hugging Face API error", details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();
    return Response.json(data);
  } catch (error) {
    console.error("Hugging Face API Route Error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
