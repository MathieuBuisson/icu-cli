export function getAuthHeaders(): Record<string, string> {
  const accessToken = process.env.ICU_ACCESS_TOKEN;
  if (accessToken) {
    return { Authorization: `Bearer ${accessToken}` };
  }

  const apiKey = process.env.ICU_API_KEY;
  if (apiKey) {
    const encoded = Buffer.from(`API_KEY:${apiKey}`).toString('base64');
    return { Authorization: `Basic ${encoded}` };
  }

  throw new Error(
    'No credentials found. Set the ICU_API_KEY environment variable or the ICU_ACCESS_TOKEN environment variable.',
  );
}
