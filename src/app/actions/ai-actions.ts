'use server';

import { IDCardTemplate } from '@/types';

interface AnalyzeCardResponse {
  success: boolean;
  template?: Partial<IDCardTemplate>;
  error?: string;
}

export async function analyzeIDCardLayout(
  imageBase64: string,
  fileName: string,
  userProvidedKey?: string
): Promise<AnalyzeCardResponse> {
  const apiKey = userProvidedKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { 
      success: false, 
      error: 'GEMINI_API_KEY is not configured on the server. Please enter your Gemini API Key in the settings field.' 
    };
  }

  try {
    // Clean the base64 prefix if present
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    // Call Gemini 1.5 Flash API
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    const prompt = `
You are a professional graphic layout parser. Analyze this ID card image and extract its visual design and coordinates for reconstruction.
Return a valid JSON object matching the following structure:

{
  "layout": "vertical" or "horizontal",
  "width": number (percentage of standard card size width in mm; vertical is 54, horizontal is 86),
  "height": number (percentage of standard card size height in mm; vertical is 86, horizontal is 54),
  "primaryColor": "hex string",
  "secondaryColor": "hex string",
  "textColor": "hex string",
  "borderRadius": "none" | "sm" | "md" | "lg" | "full",
  "canvasElements": [
    {
      "id": "unique_string",
      "type": "photo" | "signature" | "field" | "text" | "qrcode",
      "x": number (percentage of card width 0 to 100),
      "y": number (percentage of card height 0 to 100),
      "width": number (percentage of card width 0 to 100),
      "height": number (percentage of card height 0 to 100),
      "fontSize": number (font size, typically between 8 and 24),
      "fontWeight": "normal" | "bold",
      "color": "hex string",
      "align": "left" | "center" | "right",
      // If type is "field":
      "fieldKey": "name" | "rollNumber" | "admissionNumber" | "className" | "phone" | "currentAddress" | "bloodGroup" | "dateOfBirth",
      "fieldLabel": "e.g., 'Name:', 'Roll No:', 'Class:'",
      // If type is "text":
      "text": "the literal static text displayed"
    }
  ]
}

Guidelines:
1. Ensure 'x' and 'y' represent the absolute top-left coordinates as a percentage of the entire card's width and height.
2. If the photo or text fields are located inside a card body (like below a header of height ~22%), make sure 'y' is calculated relative to the absolute top of the card (e.g. if the header takes 22% and the name is below it, its 'y' would be around 25-30%).
3. Detect the student's photo slot and map it as type: "photo". Standard vertical width=30, height=35.
4. Detect signature slot if present and map it as type: "signature".
5. Detect barcode or QR code if present and map it as type: "qrcode".
6. Detect all text fields. If a field represents a student property (like Name, Roll No, Class, Address, Phone, Date of Birth), use type: "field" and map it to the correct fieldKey from the list above. Preserve the visual label (e.g. 'Class :') in fieldLabel.
7. Return ONLY the raw JSON object. Do not include markdown code block formatting (like \`\`\`json).
`;

    const payload = {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: cleanBase64
              }
            }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json"
      }
    };

    console.log('[analyzeIDCardLayout] Sending request to Gemini...');
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('[analyzeIDCardLayout] Gemini error response:', errorText);
      return { success: false, error: `Gemini API error (Status ${res.status}): ${errorText}` };
    }

    const json = await res.json();
    const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      console.error('[analyzeIDCardLayout] Empty parts text response');
      return { success: false, error: 'Gemini returned an empty response.' };
    }

    const cleanedText = rawText.trim();
    console.log('[analyzeIDCardLayout] Parsing template JSON response...');
    const templateData = JSON.parse(cleanedText);

    // Make sure structure is complete
    const completeTemplate: Partial<IDCardTemplate> = {
      name: `AI Template ${new Date().toLocaleDateString()}`,
      layout: templateData.layout || 'vertical',
      width: templateData.width || 54,
      height: templateData.height || 86,
      primaryColor: templateData.primaryColor || '#1e3a8a',
      secondaryColor: templateData.secondaryColor || '#ffffff',
      fontFamily: 'Inter',
      textColor: templateData.textColor || '#000000',
      borderRadius: templateData.borderRadius || 'md',
      layoutMode: 'drag-drop',
      showLogo: true,
      showPhoto: true,
      signatureText: 'Principal',
      fields: [], // Standard old fields layout (not used in drag-drop but required by type definition)
      canvasElements: (templateData.canvasElements || []).map((el: any, idx: number) => ({
        id: el.id || `ai_el_${idx}_${Date.now()}`,
        type: el.type || 'text',
        x: typeof el.x === 'number' ? el.x : 10,
        y: typeof el.y === 'number' ? el.y : 10,
        width: typeof el.width === 'number' ? el.width : 50,
        height: typeof el.height === 'number' ? el.height : 8,
        rotation: 0,
        opacity: 1,
        zIndex: idx + 1,
        fontSize: el.fontSize || 12,
        fontWeight: el.fontWeight || 'normal',
        color: el.color || '#000000',
        align: el.align || 'left',
        fieldKey: el.fieldKey,
        fieldLabel: el.fieldLabel,
        text: el.text
      }))
    };

    return { success: true, template: completeTemplate };

  } catch (err: any) {
    console.error('[analyzeIDCardLayout] Exception:', err);
    return { success: false, error: err?.message || String(err) };
  }
}
