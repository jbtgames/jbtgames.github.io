const { readJson, writeJson } = require('./_storage');

function summarizeCase(caseItem) {
  const comments = caseItem.comments || [];
  if (!comments.length) {
    caseItem.ai_summary = 'No public sentiment recorded yet.';
    return caseItem;
  }

  const average = comments.reduce((acc, c) => acc + (c.sentiment || 0), 0) / comments.length;
  const topReasons = comments
    .slice(-5)
    .map((c) => `• ${c.text.slice(0, 80)}`)
    .join('\n');

  caseItem.ai_summary = `${average > 0 ? 'Mostly supportive crowd.' : average < 0 ? 'Crowd leans critical.' : 'Sentiment is evenly split.'}\n${topReasons}`;
  caseItem.publicSentiment = average;
  return caseItem;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const cases = await readJson('cases.json');
  const updated = cases.map(summarizeCase);
  await writeJson('cases.json', updated);
  res.status(200).json({ ok: true, casesUpdated: updated.length });
};
