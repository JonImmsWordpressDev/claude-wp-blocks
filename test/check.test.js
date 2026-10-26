const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { checkPattern } = require('../lib/check');

const fixture = (name) => fs.readFileSync(path.join(__dirname, 'fixtures', name), 'utf8');
const rules = (findings) => findings.map((f) => f.rule);

for (const name of [
	'good-native.php',
	'good-php-divider.php',
	'good-php-echo.php',
	'good-small-html.php',
	'good-no-close-tag.php',
]) {
	test(`${name} has no findings`, () => {
		const result = checkPattern(fixture(name));
		assert.deepStrictEqual(result.errors, []);
		assert.deepStrictEqual(result.warnings, []);
	});
}

test('a comment inside wp:html is not an error', () => {
	assert.deepStrictEqual(checkPattern(fixture('good-comment-in-html.php')).errors, []);
});

test('a bare comment between blocks is an error on its line', () => {
	const { errors, warnings } = checkPattern(fixture('bad-bare-comment.php'));
	assert.strictEqual(errors.length, 1);
	assert.strictEqual(errors[0].rule, 'bare-comment');
	assert.strictEqual(errors[0].line, 8);
	assert.match(errors[0].message, /<\?php \/\* \.\.\. \*\/ \?>/);
	assert.deepStrictEqual(warnings, []);
});

test('CRLF line endings keep line numbers right', () => {
	const crlf = fixture('bad-bare-comment.php').replace(/\r?\n/g, '\r\n');
	const { errors } = checkPattern(crlf);
	assert.strictEqual(errors.length, 1);
	assert.strictEqual(errors[0].line, 8);
});

test('a block that is never closed is reported at its opener', () => {
	const { errors } = checkPattern(fixture('bad-unclosed.php'));
	assert.strictEqual(errors.length, 1);
	assert.strictEqual(errors[0].rule, 'unbalanced');
	assert.strictEqual(errors[0].line, 6);
	assert.match(errors[0].message, /wp:group/);
});

test('a closer for the wrong block is reported at the closer', () => {
	const { errors } = checkPattern(fixture('bad-mismatch.php'));
	assert.ok(errors.length >= 1);
	assert.ok(errors.every((e) => e.rule === 'unbalanced'));
	assert.ok(errors.some((e) => e.line === 10 && /column/.test(e.message) && /group/.test(e.message)));
});

test('a pattern that is mostly wp:html gets one warning and no errors', () => {
	const { errors, warnings } = checkPattern(fixture('bad-mostly-html.php'));
	assert.deepStrictEqual(errors, []);
	assert.deepStrictEqual(rules(warnings), ['mostly-html']);
	assert.strictEqual(warnings[0].line, 1);
});

test('an empty file has no findings', () => {
	assert.deepStrictEqual(checkPattern(''), { errors: [], warnings: [] });
});

test('namespaced block names balance', () => {
	const src = '<!-- wp:acme/card {"tone":"dark"} -->\n<div>x</div>\n<!-- /wp:acme/card -->\n';
	assert.deepStrictEqual(checkPattern(src), { errors: [], warnings: [] });
});

test('core more and nextpage markers are not bare comments', () => {
	const src = [
		'<!-- wp:more {"noTeaser":true} -->',
		'<!--more-->',
		'<!--noteaser-->',
		'<!-- /wp:more -->',
		'<!-- wp:nextpage -->',
		'<!--nextpage-->',
		'<!-- /wp:nextpage -->',
	].join('\n');
	assert.deepStrictEqual(checkPattern(src), { errors: [], warnings: [] });
});

test('a delimiter echoed from PHP makes balance a warning, not an error', () => {
	const src = "<?php echo '<!-- wp:paragraph -->'; ?>\n<p>x</p>\n<!-- /wp:paragraph -->\n";
	const { errors, warnings } = checkPattern(src);
	assert.deepStrictEqual(errors, []);
	assert.deepStrictEqual(rules(warnings), ['unbalanced']);
});

test('balance stays an error when PHP holds no delimiters', () => {
	const src = "<?php echo esc_html( 'x' ); ?>\n<!-- wp:group -->\n<div></div>\n";
	assert.deepStrictEqual(rules(checkPattern(src).errors), ['unbalanced']);
});
