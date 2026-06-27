export async function POST(req) {
  try {
    const { text } = await req.json();

    if (!text) {
      return Response.json({ error: "Text is required" }, { status: 400 });
    }

    const response = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "llama2", prompt: text }),
    });

    if (!response.ok) {
      return Response.json({ error: "Ollama API error" }, { status: response.status });
    }

    const data = await response.json();
    return Response.json(data);
  } catch (error) {
    console.error("Ollama API Route Error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
