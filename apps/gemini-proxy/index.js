export default {
  async fetch(request, env, ctx) {
    // Only allow POST requests for the Gemini API
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    // CORS Headers for the mobile app
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      const url = new URL(request.url);
      
      // We route the request to the official Google Gemini API endpoint
      const geminiUrl = `https://generativelanguage.googleapis.com${url.pathname}${url.search}`;
      
      // Clone the request to forward the body (the image data)
      const requestBody = await request.clone().text();
      
      // Inject the hidden API key from the Cloudflare Secret Environment
      const geminiResponse = await fetch(geminiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': env.GEMINI_API_KEY, // Secret hidden key
        },
        body: requestBody,
      });

      const responseBody = await geminiResponse.text();
      
      return new Response(responseBody, {
        status: geminiResponse.status,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), { 
        status: 500,
        headers: corsHeaders 
      });
    }
  }
};
