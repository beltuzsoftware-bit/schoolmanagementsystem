"use client"; // important for Next.js App Router

import { useState } from "react";

export default function TestHuggingFace() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();

    const response = await fetch("/api/huggingface", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: input }),
    });

    const data = await response.json();
    setResult(data);
  }

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter text"
        />
        <button type="submit">Send to Hugging Face</button>
      </form>

      {result && (
        <pre>{JSON.stringify(result, null, 2)}</pre>
      )}
    </div>
  );
}
