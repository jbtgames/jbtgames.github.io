const { readJson, writeJson } = require('./_storage');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { title, story } = req.body || {};
  if (!title || !story) {
    res.status(400).json({ error: 'Missing title or story' });
    return;
  }

  const cases = await readJson('cases.json');
  const id = `case_${Date.now()}`;
  const newCase = {
    id,
    title: title.trim().slice(0, 120),
    story: story.trim(),
    votes: 0,
    comments: [],
    ai_summary: '',
    status: 'pending',
    prosecution: '',
    defense: '',
    verdict: null
  };

  cases.unshift(newCase);
  await writeJson('cases.json', cases);
  res.status(201).json({ ok: true, case: newCase });
};
