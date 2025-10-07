const { readJson, writeJson } = require('./_storage');

function generateArgument(role, story) {
  const intro = story.split('.').slice(0, 2).join('.').trim();
  if (role === 'prosecution') {
    return `The prosecution argues that the actor's choices created tangible harm. ${intro} This decision reflects avoidable disrespect for others' boundaries and a lack of communication.`;
  }
  return `The defense stresses the context and intent behind the decision. ${intro} Given the pressures described, the actor acted out of necessity and attempted to limit negative impact.`;
}

function summarizeComments(comments = []) {
  if (!comments.length) {
    return ['• No public comments yet.', '• Jury sentiment pending.'];
  }
  const avg = comments.reduce((acc, c) => acc + (c.sentiment || 0), 0) / comments.length;
  const tone = avg > 0.25 ? 'supportive' : avg < -0.25 ? 'critical' : 'mixed';
  const reasons = comments.slice(-3).map((c) => `• ${c.text.slice(0, 90)}`);
  return [`• Crowd tone: ${tone}.`, ...reasons];
}

function judgeVerdict(story, prosecution, defense, commentsSummary) {
  const severity = prosecution.length - defense.length;
  const publicTone = commentsSummary.find((line) => line.includes('Crowd tone')) || '';
  const judgeScore = severity > 0 ? 70 : 30;
  const publicScore = publicTone.includes('supportive') ? 25 : publicTone.includes('critical') ? 70 : 50;
  const juryScore = publicScore;

  const finalScore = Math.round(0.5 * judgeScore + 0.3 * publicScore + 0.2 * juryScore);
  let decision;
  if (finalScore <= 25) decision = 'Morally Justified';
  else if (finalScore <= 50) decision = 'Mostly Justified';
  else if (finalScore <= 75) decision = 'Morally Wrong';
  else decision = 'Severe Violation';

  return {
    decision,
    reasoning: `Considering the arguments and crowd reaction (${publicTone || 'no sentiment yet'}), the judge leans toward ${decision.toLowerCase()}.`,
    confidence: 65,
    judge: 'Judge Iron',
    finalScore
  };
}

module.exports = async (req, res) => {
  const cases = await readJson('cases.json');
  const pending = cases.filter((item) => item.status !== 'judged').slice(0, 3);

  pending.forEach((caseItem) => {
    const prosecution = generateArgument('prosecution', caseItem.story);
    const defense = generateArgument('defense', caseItem.story);
    const summary = summarizeComments(caseItem.comments);
    const verdict = judgeVerdict(caseItem.story, prosecution, defense, summary);

    caseItem.prosecution = prosecution;
    caseItem.defense = defense;
    caseItem.ai_summary = summary.join('\n');
    caseItem.verdict = {
      decision: verdict.decision,
      reasoning: verdict.reasoning,
      confidence: verdict.confidence,
      judge: verdict.judge
    };
    caseItem.status = 'judged';
    caseItem.finalScore = verdict.finalScore;
  });

  const updatedCases = cases.map((item) => pending.find((p) => p.id === item.id) || item);
  await writeJson('cases.json', updatedCases);

  res.status(200).json({ ok: true, processed: pending.map((item) => item.id) });
};
