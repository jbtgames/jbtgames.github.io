const { readJson, writeJson } = require('./_storage');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { id, delta } = req.body || {};
  if (!id || !delta) {
    res.status(400).json({ error: 'Missing id or delta' });
    return;
  }

  const cases = await readJson('cases.json');
  const item = cases.find((entry) => entry.id === id);
  if (!item) {
    res.status(404).json({ error: 'Case not found' });
    return;
  }

  item.votes = Math.max(0, (item.votes || 0) + Number(delta));
  await writeJson('cases.json', cases);
  res.status(200).json({ ok: true, votes: item.votes });
};
