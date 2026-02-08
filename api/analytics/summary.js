// Returns placeholder analytics summary; extend to read from your store

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  return res.status(200).json({
    since: new Date(Date.now() - 7*24*3600*1000).toISOString(),
    totals: {
      apiCalls: 0,
      reversePromptRuns: 0,
      builderRuns: 0,
      usersActive: 0,
      estimatedCostUsd: 0,
    },
    notes: 'Connect to persistence to see real values.'
  });
}

