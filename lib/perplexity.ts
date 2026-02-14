// Perplexity AI uses OpenAI-compatible API, so we use the OpenAI SDK
// with Perplexity's baseURL to connect to their service
import OpenAI from 'openai';

let perplexityClient: OpenAI | null = null;

function getPerplexityClient(): OpenAI {
  if (!perplexityClient) {
    const apiKey = process.env.PERPLEXITY_API_KEY;
    
    if (!apiKey || apiKey === 'placeholder-for-build') {
      const errorMsg = 'PERPLEXITY_API_KEY environment variable is not set or is invalid. Please set it in your .env file or environment variables.';
      console.error(errorMsg);
      throw new Error(errorMsg);
    }
    
    perplexityClient = new OpenAI({
      apiKey,
      baseURL: 'https://api.perplexity.ai', // Perplexity AI endpoint
    });
    
    console.log('Perplexity client initialized successfully');
  }
  return perplexityClient;
}

// Use a Proxy to lazily initialize the client only when properties are accessed
// This ensures the client is not created during build time
const perplexity = new Proxy({} as OpenAI, {
  get(_target, prop) {
    // Get the actual client (initializes on first access)
    const client = getPerplexityClient();
    // Return the property from the real client
    // This works for nested properties because we return the actual OpenAI SDK objects
    return (client as any)[prop];
  },
}) as OpenAI;

export default perplexity;