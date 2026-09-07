#!/usr/bin/env python3
"""Validate the German (Einbuergerungstest) content pack.

Run:  python3 apps/us-citizenship/content/de/validate.py

This is the Germany-specific supplement. Run `tools/validate-content-pack.py` as well -
it is the shared validator every pack has to pass, and it owns everything that is not
peculiar to Germany: ids, duplicate detection, answer-is-an-option, correctIndex validity,
image references and licence, and the PDF-extraction hygiene checks (mojibake, leftover
Wingdings checkbox glyphs, invisible control characters, truncation ellipses) that were
first written here and have since been generalised there, because Spain and the UK will be
extracted from PDFs too.

What is left here is the part only Germany knows: the exact 300 + 10x16 shape, against a
named list of the sixteen Bundeslaender.

Asserts the invariants that matter for this pack:
  * exactly 300 nationwide questions and 160 state-specific ones (10 x 16 Bundeslaender)
  * every question has exactly 4 options with exactly one marked correct
  * the marked correct answer is one of that question's own 4 options
  * no duplicate question ids anywhere in the pack
  * no empty strings, no truncation ellipses, no placeholder text
  * German umlauts / sharp s survived extraction (no mojibake such as A-tilde-curren for a-umlaut)
  * no leftover Wingdings / empty-checkbox glyphs from the PDF
Exits non-zero on any failure.
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
PACK = os.path.join(HERE, 'einbuergerungstest.json')

EXPECTED_GENERAL = 300
EXPECTED_PER_STATE = 10
EXPECTED_STATES = 16
EXPECTED_STATE_TOTAL = EXPECTED_PER_STATE * EXPECTED_STATES

BUNDESLAENDER = [
    'Baden-Württemberg', 'Bayern', 'Berlin', 'Brandenburg', 'Bremen', 'Hamburg',
    'Hessen', 'Mecklenburg-Vorpommern', 'Niedersachsen', 'Nordrhein-Westfalen',
    'Rheinland-Pfalz', 'Saarland', 'Sachsen', 'Sachsen-Anhalt', 'Schleswig-Holstein',
    'Thüringen',
]

# What UTF-8 German text looks like when it has been decoded as latin-1 / cp1252.
MOJIBAKE = ['Ã¤', 'Ã¶', 'Ã¼', 'Ã',
            'Ã„', 'Ã–', 'Ãœ', 'â€',
            '�']
PLACEHOLDER = re.compile(r'\b(TODO|TBD|FIXME|XXX|PLACEHOLDER|LOREM|Lorem ipsum)\b', re.I)
# Wingdings2 private-use box, literal white square, and ballot box.
CHECKBOX_GLYPHS = ['', '□', '☐']
BAD_CONTROL = ['﻿', '​', '­']

errors = []
warnings = []


def err(msg):
    errors.append(msg)


def warn(msg):
    warnings.append(msg)


if not os.path.exists(PACK):
    print('FAIL: pack not found at %s' % PACK)
    sys.exit(1)

pack = json.loads(open(PACK, encoding='utf-8').read())

# ------------------------------------------------------------------ top level
for field in ['version', 'source', 'sourceRetrieved', 'totalQuestions',
              'askedPerInterview', 'passRequirement', 'categories', 'language']:
    if field not in pack:
        err('top level: missing required field %r' % field)

if pack.get('language') != 'de':
    err('top level: language must be "de", got %r' % pack.get('language'))
if not pack.get('officialTestName'):
    err('top level: officialTestName missing or empty')
if pack.get('askedPerInterview') != 33:
    err('top level: askedPerInterview must be 33, got %r' % pack.get('askedPerInterview'))
if pack.get('passRequirement') != 17:
    err('top level: passRequirement must be 17, got %r' % pack.get('passRequirement'))

# ------------------------------------------------------------------ collect
general = []
for cat in pack.get('categories', []):
    general.extend(cat.get('questions', []))

state_cats = pack.get('stateCategories', [])
state_qs = []
for cat in state_cats:
    state_qs.extend(cat.get('questions', []))

if len(general) != EXPECTED_GENERAL:
    err('general questions: expected %d, found %d' % (EXPECTED_GENERAL, len(general)))
if len(state_cats) != EXPECTED_STATES:
    err('state categories: expected %d, found %d' % (EXPECTED_STATES, len(state_cats)))
if len(state_qs) != EXPECTED_STATE_TOTAL:
    err('state questions: expected %d, found %d' % (EXPECTED_STATE_TOTAL, len(state_qs)))
if pack.get('totalQuestions') != len(general):
    err('totalQuestions (%r) != number of general questions (%d)'
        % (pack.get('totalQuestions'), len(general)))
if pack.get('stateQuestionsTotal') not in (None, len(state_qs)):
    err('stateQuestionsTotal (%r) != number of state questions (%d)'
        % (pack.get('stateQuestionsTotal'), len(state_qs)))

KEBAB = re.compile(r'[a-z0-9]+(-[a-z0-9]+)*\Z')

for cat in pack.get('categories', []):
    for field in ['id', 'section', 'subsection', 'questions']:
        if not cat.get(field):
            err('category %r: missing %r' % (cat.get('id'), field))
    if not KEBAB.match(cat.get('id', '')):
        err('category id %r is not lowercase kebab-case' % cat.get('id'))

seen_states = [c.get('state') for c in state_cats]
for land in BUNDESLAENDER:
    if seen_states.count(land) != 1:
        err('Bundesland %r appears %d time(s) in stateCategories, expected 1'
            % (land, seen_states.count(land)))
for cat in state_cats:
    count = len(cat.get('questions', []))
    if count != EXPECTED_PER_STATE:
        err('Bundesland %r: expected %d questions, found %d'
            % (cat.get('state'), EXPECTED_PER_STATE, count))
    for field in ['id', 'section', 'subsection', 'state', 'stateCode', 'questions']:
        if not cat.get(field):
            err('state category %r: missing %r' % (cat.get('id'), field))
    if not KEBAB.match(cat.get('id', '')):
        err('state category id %r is not lowercase kebab-case' % cat.get('id'))
    # A state question must never leak into another state's set.
    for q in cat.get('questions', []):
        if q.get('state') != cat.get('state'):
            err('question id %r sits under %r but is tagged state=%r'
                % (q.get('id'), cat.get('state'), q.get('state')))

# ------------------------------------------------------------------ text checks
def check_text(label, value):
    if not isinstance(value, str) or not value.strip():
        err('%s: empty or non-string' % label)
        return
    if value != value.strip():
        err('%s: leading or trailing whitespace' % label)
    if '  ' in value:
        err('%s: double space -> %r' % (label, value[:80]))
    for bad in MOJIBAKE:
        if bad in value:
            err('%s: MOJIBAKE %r in %r' % (label, bad, value[:80]))
    for glyph in CHECKBOX_GLYPHS:
        if glyph in value:
            err('%s: leftover checkbox glyph U+%04X' % (label, ord(glyph)))
    for ctrl in BAD_CONTROL:
        if ctrl in value:
            err('%s: control/BOM/soft-hyphen character U+%04X' % (label, ord(ctrl)))
    if PLACEHOLDER.search(value):
        err('%s: placeholder text -> %r' % (label, value[:80]))
    # A trailing ellipsis is how the official catalogue writes sentence-completion
    # stems, so it is legitimate. An ellipsis wedged between word characters means
    # text was truncated during extraction.
    if re.search(r'\w\.\.\.\w|\w…\w', value):
        err('%s: suspected truncation ellipsis -> %r' % (label, value[:80]))


ids = {}
all_qs = [('general', q) for q in general] + [('state', q) for q in state_qs]
no_answer = []
bad_shape = 0

for kind, q in all_qs:
    qid = q.get('id')
    label = '%s question id=%r' % (kind, qid)

    if not isinstance(qid, int) or isinstance(qid, bool):
        err('%s: id must be a number' % label)
    elif qid in ids:
        err('DUPLICATE question id %r (already used by %s)' % (qid, ids[qid]))
    else:
        ids[qid] = label

    check_text(label + ' question', q.get('question'))

    opts = q.get('options')
    if not isinstance(opts, list) or len(opts) != 4:
        err('%s: expected exactly 4 options, got %r'
            % (label, len(opts) if isinstance(opts, list) else opts))
        bad_shape += 1
        continue

    for i, opt in enumerate(opts):
        check_text('%s option[%d]' % (label, i), opt)
    if len({o.strip() for o in opts if isinstance(o, str)}) != 4:
        err('%s: duplicate option text among the 4 options -> %r' % (label, opts))

    ci = q.get('correctIndex')
    ans = q.get('answers')
    if ci is None:
        no_answer.append(qid)
        bad_shape += 1
        continue
    if not isinstance(ci, int) or isinstance(ci, bool) or not (0 <= ci < 4):
        err('%s: correctIndex must be an int 0..3, got %r' % (label, ci))
        bad_shape += 1
        continue
    if not isinstance(ans, list) or len(ans) != 1:
        err('%s: answers must hold exactly one correct answer, got %r' % (label, ans))
        bad_shape += 1
        continue
    if ans[0] != opts[ci]:
        err('%s: answers[0] %r != options[correctIndex] %r' % (label, ans[0], opts[ci]))
        bad_shape += 1
        continue
    if ans[0] not in opts:
        err("%s: correct answer is not one of the question's own options" % label)
        bad_shape += 1

if no_answer:
    err('%d question(s) have no correct answer marked (correctIndex null): %s'
        % (len(no_answer), no_answer[:20]))

gen_ids = {q.get('id') for q in general}
for q in state_qs:
    if q.get('id') in gen_ids:
        err('state question id %r collides with a general question id' % q.get('id'))

# ------------------------------------------------------------------ umlaut survival
chunks = []
for _kind, q in all_qs:
    if isinstance(q.get('question'), str):
        chunks.append(q['question'])
    for opt in (q.get('options') or []):
        if isinstance(opt, str):
            chunks.append(opt)
blob = '\n'.join(chunks)

for ch in 'äöüßÄÖÜ':
    if ch not in blob:
        err('umlaut check: U+%04X appears nowhere in the pack - extraction likely lost it'
            % ord(ch))

# ------------------------------------------------------------------ report
ok_shape = sum(1 for _k, q in all_qs
               if isinstance(q.get('options'), list) and len(q['options']) == 4
               and isinstance(q.get('correctIndex'), int)
               and not isinstance(q.get('correctIndex'), bool))

print('German pack validation - %s' % PACK)
print('  general (nationwide) questions : %d (expected %d)' % (len(general), EXPECTED_GENERAL))
print('  state categories               : %d (expected %d)' % (len(state_cats), EXPECTED_STATES))
print('  state-specific questions       : %d (expected %d)' % (len(state_qs), EXPECTED_STATE_TOTAL))
print('  total questions in pack        : %d' % len(all_qs))
print('  unique question ids            : %d' % len(ids))
print('  4 options + exactly one correct: %d of %d' % (ok_shape, len(all_qs)))
print('  questions needing the picture  : %d' % sum(1 for _k, q in all_qs if q.get('requiresImage')))
print('  umlauts present, no mojibake   : %s'
      % ('yes' if not any('MOJIBAKE' in e or 'umlaut check' in e for e in errors) else 'NO'))

if warnings:
    print('')
    print('%d warning(s):' % len(warnings))
    for w in warnings[:20]:
        print('  WARN %s' % w)

if errors:
    print('')
    print('%d ERROR(S):' % len(errors))
    for e in errors[:60]:
        print('  FAIL %s' % e)
    sys.exit(1)

print('')
print('OK - all assertions passed.')
