import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { rows } = await request.json();

    if (!rows || !Array.isArray(rows)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    // Limit to the first 50 rows to keep the prompt small and fast
    const sample = rows.slice(0, 50);

    const prompt = `
You are a data quality assistant. I am providing you with a JSON array of rows from a spreadsheet.
Your task is to identify typos, inconsistent formatting, or invalid values that can be fixed.
Only return actionable suggestions for specific rows. 
Do not suggest fixes that are already valid. Do not suggest fixes for empty values unless you can infer them.

Respond ONLY with a valid JSON array of objects. Do not include markdown code blocks, just raw JSON.
Format of each object in the array:
{
  "row": <index of the row, starting from 0>,
  "field": "<column name>",
  "originalValue": "<current value>",
  "suggestedValue": "<new value>",
  "reason": "<short explanation why this should be changed>"
}

Here is the data:
${JSON.stringify(sample)}
`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini', // Fast and capable model
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('OpenRouter API error:', err);
      return NextResponse.json({ error: 'Failed to fetch from AI provider' }, { status: 502 });
    }

    const data = await response.json();
    let content = data.choices[0].message.content.trim();

    // Remove markdown json wrappers if present
    if (content.startsWith('```json')) {
      content = content.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    } else if (content.startsWith('```')) {
      content = content.replace(/^```\n?/, '').replace(/\n?```$/, '');
    }

    const suggestions = JSON.parse(content);
    return NextResponse.json({ suggestions });

  } catch (error) {
    console.error('AI Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
