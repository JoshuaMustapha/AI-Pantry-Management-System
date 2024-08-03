import { OpenAI } from 'openai';

export async function POST(request) {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  try {
    const { imageUrl } = await request.json();
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "What object is in this image?" },
            { type: "text", text: "Try to answer in only one word, for example 'apple', 'banana', 'person'" },
            { 
              type: "image_url", 
              image_url: {
                url: imageUrl
              }
            }
          ],
        },
      ],
      max_tokens: 300,
    });

    return Response.json({ result: response.choices[0].message.content });
  } catch (error) {
    console.error('Error in API route:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}