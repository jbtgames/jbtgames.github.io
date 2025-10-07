const { readJson, writeJson } = require('./_storage');

function summarizeSentiment(comments) {
  if (!comments.length) return 'No comments yet.';
  const average = comments.reduce((acc, c) => acc + (c.sentiment || 0), 0) / comments.length;
  if (average > 0.35) return 'Crowd leans supportive with mostly positive takes.';
  if (average < -0.35) return 'Crowd is largely critical of the actor.';
  return 'Opinions are mixed with no clear majority.';
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { id, user, text, sentiment = 0 } = req.body || {};
  if (!id || !user || !text) {
    res.status(400).json({ error: 'Missing id, user, or text' });
    return;
  }

  const cases = await readJson('cases.json');
  const index = cases.findIndex((item) => item.id === id);
  if (index === -1) {
    res.status(404).json({ error: 'Case not found' });
    return;
  }

  const comment = {
    user: user.trim().slice(0, 40) || 'anon',
    text: text.trim(),
    sentiment: Number.isFinite(Number(sentiment)) ? Number(sentiment) : 0
  };

  cases[index].comments = cases[index].comments || [];
  cases[index].comments.push(comment);
  cases[index].ai_summary = summarizeSentiment(cases[index].comments);

  await writeJson('cases.json', cases);
  res.status(200).json({ ok: true, comment });
};
