export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'NVIDIA_API_KEY not configured' });
  }

  try {
    const { model, messages } = req.body;

    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model || 'nvidia/nemotron-3-super-120b-a12b',
        temperature: 0.6,
        top_p: 0.95,
        max_tokens: 4096,
        messages,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return res.status(response.status).json({ 
        error: errData?.error?.message || errData?.detail || `API error ${response.status}` 
      });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    console.error('NVIDIA API error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
