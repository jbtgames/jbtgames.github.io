(function () {
  var globalObject = typeof window !== 'undefined' ? window : globalThis;
  if (globalObject.JuryAI) {
    return;
  }

  function clamp(value, min, max) {
    if (value < min) return min;
    if (value > max) return max;
    return value;
  }

  function toNumber(value) {
    var number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }

  function normaliseCommentList(comments) {
    if (!Array.isArray(comments)) {
      return [];
    }
    return comments
      .filter(function (item) {
        return item !== null && item !== undefined;
      })
      .map(function (comment) {
        var user = '';
        if (comment && comment.user) {
          user = String(comment.user);
        }
        var text = '';
        if (comment && comment.text) {
          text = String(comment.text);
        }
        return {
          user: user.slice(0, 48),
          text: text.replace(/\s+/g, ' ').trim(),
          sentiment: toNumber(comment ? comment.sentiment : 0)
        };
      });
  }

  function bucketComments(list) {
    var buckets = { positive: [], negative: [], neutral: [] };
    list.forEach(function (item) {
      if (item.sentiment >= 0.25) {
        buckets.positive.push(item);
      } else if (item.sentiment <= -0.25) {
        buckets.negative.push(item);
      } else {
        buckets.neutral.push(item);
      }
    });
    return buckets;
  }

  function snippet(text) {
    if (!text) {
      return 'the overall context of the case';
    }
    var trimmed = text.replace(/\s+/g, ' ').trim();
    if (!trimmed) {
      return 'the overall context of the case';
    }
    if (trimmed.length > 120) {
      return trimmed.slice(0, 117) + '…';
    }
    return trimmed;
  }

  function addLine(lines, text) {
    if (!text) {
      return;
    }
    if (lines.indexOf(text) === -1) {
      lines.push(text);
    }
  }

  function summarisePreparedComments(list) {
    var lines = [];
    if (!list.length) {
      return {
        average: 0,
        lines: ['• No crowd feedback yet.'],
        count: 0,
        buckets: { positive: [], negative: [], neutral: [] }
      };
    }
    var total = list.reduce(function (sum, item) {
      return sum + item.sentiment;
    }, 0);
    var average = total / list.length;
    var buckets = bucketComments(list);

    if (average > 0.15) {
      addLine(lines, '• Crowd leans supportive of the respondent.');
    } else if (average < -0.15) {
      addLine(lines, '• Crowd leans critical and backs the complaint.');
    } else {
      addLine(lines, '• Crowd sentiment is split with no clear majority.');
    }

    if (buckets.positive.length) {
      addLine(lines, '• Supporters highlight ' + snippet(buckets.positive[0].text) + '.');
    }
    if (buckets.negative.length) {
      addLine(lines, '• Critics focus on ' + snippet(buckets.negative[0].text) + '.');
    }
    if (!buckets.positive.length && !buckets.negative.length && buckets.neutral.length) {
      addLine(lines, '• Most comments stay neutral, sharing context without taking sides.');
    }

    return {
      average: average,
      lines: lines,
      count: list.length,
      buckets: buckets
    };
  }

  function summariseComments(comments) {
    var list = normaliseCommentList(comments);
    return summarisePreparedComments(list);
  }

  function processCaseForVerdict(caseItem) {
    var base = typeof caseItem === 'object' && caseItem ? caseItem : {};
    var list = normaliseCommentList(base.comments);
    var summary = summarisePreparedComments(list);
    var leaning = summary.average;
    var count = summary.count;

    var decision;
    if (leaning > 0.2) {
      decision = 'Recommend leniency for the respondent';
    } else if (leaning < -0.2) {
      decision = 'Sustain the complaint and issue a warning';
    } else {
      decision = 'Seek a mediated agreement between both parties';
    }

    var confidenceBase = Math.round(Math.abs(leaning) * 120) + (count > 4 ? 25 : 10);
    var confidence = clamp(confidenceBase, 55, 98);

    var votes = toNumber(base.votes);
    var reasoningParts = [
      'Average crowd sentiment scored ' + Math.round(leaning * 100) + ' / 100.'
    ];
    if (count) {
      reasoningParts.push('Considered ' + count + ' community comment' + (count === 1 ? '' : 's') + ' with weighted sentiment.');
    } else {
      reasoningParts.push('No public comments were submitted, so the court defaults to a cautious ruling.');
    }
    if (Number.isFinite(votes) && votes > 0) {
      reasoningParts.push('Community vote count currently sits at ' + votes + '.');
    }
    var reasoning = reasoningParts.join(' ');

    var negativeHighlight = summary.buckets.negative.length ? snippet(summary.buckets.negative[0].text) : '';
    var positiveHighlight = summary.buckets.positive.length ? snippet(summary.buckets.positive[0].text) : '';

    var prosecutionArgument;
    if (base.prosecution && String(base.prosecution).trim().length) {
      prosecutionArgument = String(base.prosecution);
    } else if (negativeHighlight) {
      prosecutionArgument = 'Prosecution stresses that ' + negativeHighlight + '.';
    } else {
      prosecutionArgument = 'Prosecution recorded limited opposition and leans on policy consistency.';
    }

    var defenseArgument;
    if (base.defense && String(base.defense).trim().length) {
      defenseArgument = String(base.defense);
    } else if (positiveHighlight) {
      defenseArgument = 'Defense argues that ' + positiveHighlight + '.';
    } else {
      defenseArgument = 'Defense notes the lack of direct harm raised in the crowd discussion.';
    }

    var finalScore = Math.round((clamp(leaning, -1, 1) + 1) * 50);

    return Object.assign({}, base, {
      status: 'judged',
      verdict: {
        decision: decision,
        reasoning: reasoning,
        judge: 'Judge Delta',
        confidence: confidence
      },
      prosecution: prosecutionArgument,
      defense: defenseArgument,
      finalScore: finalScore,
      ai_summary: summary.lines.join('\n'),
      publicSentiment: leaning
    });
  }

  globalObject.JuryAI = {
    summariseComments: summariseComments,
    processCaseForVerdict: processCaseForVerdict
  };
})();
