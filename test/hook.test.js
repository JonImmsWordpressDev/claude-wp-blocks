const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { isPatternFile } = require('../scripts/check-pattern');

const script = path.join(__dirname, '..', 'scripts', 'check-pattern.js');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wpb-'));
const patterns = path.join(tmp, 'theme', 'patterns');
fs.mkdirSync(patterns, { recursive: true });

function copy(name) {
	const dest = path.join(patterns, name);
	fs.copyFileSync(path.join(__dirname, 'fixtures', name), dest);
	return dest;
}

function run(input) {
	return spawnSync('node', [script], { input, encoding: 'utf8', cwd: tmp });
}

const write = (file_path) => JSON.stringify({ tool_name: 'Write', tool_input: { file_path, content: 'ignored' } });

test.after(() => fs.rmSync(tmp, { recursive: true, force: true }));

test('isPatternFile matches only php files directly inside patterns/', () => {
	assert.strictEqual(isPatternFile('/a/theme/patterns/hero.php'), true);
	assert.strictEqual(isPatternFile('C:\\a\\theme\\patterns\\hero.php'), true);
	assert.strictEqual(isPatternFile('/a/theme/patterns/archive/hero.php'), false);
	assert.strictEqual(isPatternFile('/a/theme/template-parts/patterns.php'), false);
	assert.strictEqual(isPatternFile('/a/theme/patterns/hero.html'), false);
	assert.strictEqual(isPatternFile('/a/functions.php'), false);
});

test('a bare comment after Write blocks with exit 2 and names the line', () => {
	const result = run(write(copy('bad-bare-comment.php')));
	assert.strictEqual(result.status, 2);
	assert.match(result.stderr, /bare-comment/);
	assert.match(result.stderr, /:8/);
	assert.doesNotMatch(result.stderr, new RegExp(os.tmpdir().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});

test('an Edit payload is checked from the file on disk', () => {
	const file_path = copy('bad-bare-comment.php');
	const input = JSON.stringify({ tool_name: 'Edit', tool_input: { file_path, old_string: 'x', new_string: 'y' } });
	assert.strictEqual(run(input).status, 2);
});

test('warnings only: exit 0 with additionalContext JSON', () => {
	const result = run(write(copy('bad-mostly-html.php')));
	assert.strictEqual(result.status, 0);
	const out = JSON.parse(result.stdout);
	assert.strictEqual(out.hookSpecificOutput.hookEventName, 'PostToolUse');
	assert.match(out.hookSpecificOutput.additionalContext, /mostly-html/);
});

test('a clean pattern: exit 0, no output', () => {
	const result = run(write(copy('good-native.php')));
	assert.strictEqual(result.status, 0);
	assert.strictEqual(result.stdout, '');
	assert.strictEqual(result.stderr, '');
});

test('a file outside patterns/: exit 0, no output', () => {
	const file = path.join(tmp, 'functions.php');
	fs.writeFileSync(file, '<!-- stray -->');
	const result = run(write(file));
	assert.strictEqual(result.status, 0);
	assert.strictEqual(result.stdout + result.stderr, '');
});

test('stdin that is not JSON: exit 0, no output', () => {
	const result = run('not json');
	assert.strictEqual(result.status, 0);
	assert.strictEqual(result.stdout + result.stderr, '');
});

test('a pattern path that does not exist: exit 0, no output', () => {
	const result = run(write(path.join(patterns, 'missing.php')));
	assert.strictEqual(result.status, 0);
	assert.strictEqual(result.stdout + result.stderr, '');
});
