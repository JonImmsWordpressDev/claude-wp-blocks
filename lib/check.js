// Checks a block pattern file's markup for the mistakes that break it in the editor.
// Pure: source text in, findings out. The hook script does the file and exit-code work.

const MOSTLY_HTML_RATIO = 0.6;

const BARE_COMMENT =
	'Bare HTML comment between blocks. Gutenberg turns it into an empty paragraph or a Classic block. Use <?php /* ... */ ?> instead.';
const MOSTLY_HTML =
	'Most of this pattern is wp:html, which shows as a code box in the editor. Rebuild it with native blocks and keep wp:html for small pieces.';

const NAME = '([a-z0-9-]+(?:\\/[a-z0-9-]+)?)';
const CLOSER = new RegExp(`^\\/wp:${NAME}\\s*$`);
const OPENER = new RegExp(`^wp:${NAME}(\\s[\\s\\S]*)?$`);

// Blank out PHP so it can't be mistaken for markup, keeping newlines so line numbers hold.
// An unterminated <?php runs to the end of the file, as PHP itself treats it.
function stripPhp(source) {
	return source.replace(/<\?(?:php|=)[\s\S]*?(?:\?>|$)/g, (php) => php.replace(/[^\r\n]/g, ' '));
}

function lineAt(text, index) {
	let line = 1;
	for (let i = 0; i < index; i++) if (text[i] === '\n') line++;
	return line;
}

const nonWhitespace = (text) => text.replace(/\s/g, '').length;

// Serialized core blocks drop the "core/" prefix, but either form is valid.
const normalize = (name) => name.replace(/^core\//, '');

function checkPattern(source) {
	const markup = stripPhp(source);
	const errors = [];
	const warnings = [];
	const stack = [];
	let htmlChars = 0;
	let htmlBlocks = 0;

	const comment = /<!--([\s\S]*?)-->/g;
	let match;
	while ((match = comment.exec(markup))) {
		const inner = match[1].trim();
		const line = lineAt(markup, match.index);
		const top = stack[stack.length - 1];
		const closer = inner.match(CLOSER);
		const opener = closer ? null : inner.match(OPENER);

		// Inside wp:html everything is raw content until its own closer.
		if (top && top.name === 'html' && !(closer && normalize(closer[1]) === 'html')) continue;

		if (closer) {
			const name = normalize(closer[1]);
			if (top && top.name === name) {
				stack.pop();
				if (name === 'html') {
					htmlBlocks++;
					htmlChars += nonWhitespace(markup.slice(top.contentStart, match.index));
				}
				continue;
			}
			errors.push({
				line,
				rule: 'unbalanced',
				message: top
					? `<!-- /wp:${name} --> closes a block, but the open block is wp:${top.name} (line ${top.line}).`
					: `<!-- /wp:${name} --> has no matching opener.`,
			});
			const at = stack.map((b) => b.name).lastIndexOf(name);
			if (at !== -1) stack.length = at;
		} else if (opener) {
			if (inner.endsWith('/')) continue;
			stack.push({ name: normalize(opener[1]), line, contentStart: match.index + match[0].length });
		} else {
			errors.push({ line, rule: 'bare-comment', message: BARE_COMMENT });
		}
	}

	for (const block of stack) {
		errors.push({ line: block.line, rule: 'unbalanced', message: `<!-- wp:${block.name} --> is never closed.` });
	}

	const total = nonWhitespace(markup);
	if (htmlBlocks > 0 && total > 0 && htmlChars / total >= MOSTLY_HTML_RATIO) {
		warnings.push({ line: 1, rule: 'mostly-html', message: MOSTLY_HTML });
	}

	errors.sort((a, b) => a.line - b.line);
	return { errors, warnings };
}

module.exports = { checkPattern };
