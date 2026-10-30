import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateInput, measurePhrases, phraseRanges, wordCount } from '../shared/input.ts';

test('rejects empty, non-text and over-limit original stories', () => {
  for (const story of ['', '  ', 42, 'x'.repeat(1501)]) {
    assert.throws(() => validateInput({ story, phrases: [] }), { code: 'INVALID_INPUT' });
  }
  assert.equal(validateInput({ story: 'x'.repeat(1500), phrases: [] }).story.length, 1500);
});
test('returns the trimmed original and selected phrases without rewriting their words', () => {
  assert.deepEqual(validateInput({ story: '  Mariam kept a blue tin.  ', phrases: [' blue tin '] }),
    { story: 'Mariam kept a blue tin.', phrases: ['blue tin'] });
});
test('rejects absent, duplicate, overlong and more than five phrases', () => {
  for (const phrases of [['missing'], ['tin', 'TIN'], ['x'.repeat(81)], ['a','b','c','d','e','f'], 'tin']) {
    assert.throws(() => validateInput({story:'Mariam kept a blue tin.', phrases}), {code:'INVALID_INPUT'});
  }
});
test('allows an experiment with no watched phrases', () => {
  assert.deepEqual(validateInput({story:'The bell rang twice.'}), {story:'The bell rang twice.', phrases:[]});
});
test('matches literal phrases case-insensitively at word boundaries', () => {
  assert.deepEqual(measurePhrases('Joanne met Ann. ANN held the [blue] tin.', ['Ann','[blue]','green']),
    [{phrase:'Ann',present:true,occurrences:2},{phrase:'[blue]',present:true,occurrences:1},{phrase:'green',present:false,occurrences:0}]);
});
test('produces actual text ranges and merges overlapping watched phrases', () => {
  assert.deepEqual(phraseRanges('The blue tin is blue.', ['blue','blue tin']), [{start:4,end:12},{start:16,end:20}]);
});
test('counts observed words without counting surrounding whitespace', () => {
  assert.equal(wordCount('  One\nsmall memory.  '), 3);
  assert.equal(wordCount('  '), 0);
});
