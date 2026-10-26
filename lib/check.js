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

// Blocks whose content is raw: wp:html, and the <!--more--> / <!--nextpage--> markers core serializes.
const RAW_BLOCKS = new Set(['html', 'more', 'nextpage']);

// An unterminated <?php runs to the end of the file, as PHP itself treats it.
const PHP = /<\?(?:php|=)[\s\S]*?(?:\?>|$)/g;

// Blank out PHP so it can't be mistaken for markup, keeping newlines so line numbers hold.
function stripPhp(source) {
	return source.replace(PHP, (php) => php.replace(/[^\r\n]/g, ' '));
}

// PHP that prints block delimiters makes balance impossible to judge from the source.
const phpPrintsDelimiters = (source) => (source.match(PHP) || []).some((php) => /<!--\s*\/?wp:/.test(php));

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

		// Inside a raw block everything is content until its own closer.
		if (top && RAW_BLOCKS.has(top.name) && !(closer && normalize(closer[1]) === top.name)) continue;

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

	if (phpPrintsDelimiters(source)) {
		for (let i = errors.length - 1; i >= 0; i--) {
			if (errors[i].rule !== 'unbalanced') continue;
			const [finding] = errors.splice(i, 1);
			warnings.unshift({ ...finding, message: `${finding.message} PHP in this file prints block delimiters, so check this by hand.` });
		}
	}

	const total = nonWhitespace(markup);
	if (htmlBlocks > 0 && total > 0 && htmlChars / total >= MOSTLY_HTML_RATIO) {
		warnings.push({ line: 1, rule: 'mostly-html', message: MOSTLY_HTML });
	}

	errors.sort((a, b) => a.line - b.line);
	return { errors, warnings };
}

module.exports = { checkPattern };
