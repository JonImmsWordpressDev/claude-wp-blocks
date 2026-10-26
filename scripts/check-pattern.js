#!/usr/bin/env node
// PostToolUse hook: after Claude writes or edits a block pattern file, check it.
// Errors exit 2 so Claude sees them on stderr and fixes the file.
// Warnings go back as additionalContext and don't block.
// Anything unexpected exits 0 silently: a noisy hook is worse than a missed issue.

const fs = require('node:fs');
const path = require('node:path');
const { checkPattern } = require('../lib/check');

// WordPress only loads patterns/*.php, so nested folders don't count.
function isPatternFile(filePath) {
	const parts = String(filePath).split(/[\\/]/);
	return parts.length >= 2 && parts[parts.length - 1].toLowerCase().endsWith('.php') && parts[parts.length - 2].toLowerCase() === 'patterns';
}

// Keep home-directory paths out of what Claude echoes back.
function displayPath(filePath) {
	const relative = path.relative(process.cwd(), filePath);
	return relative && !relative.startsWith('..') && !path.isAbsolute(relative) ? relative : path.basename(filePath);
}

const format = (file, findings) => findings.map((f) => `${file}:${f.line}  [${f.rule}] ${f.message}`).join('\n');

function main() {
	try {
		const input = JSON.parse(fs.readFileSync(0, 'utf8'));
		const filePath = input && input.tool_input && input.tool_input.file_path;
		if (!filePath || !isPatternFile(filePath)) return 0;

		const { errors, warnings } = checkPattern(fs.readFileSync(filePath, 'utf8'));
		const file = displayPath(filePath);

		if (errors.length) {
			process.stderr.write(`${format(file, [...errors, ...warnings])}\n`);
			return 2;
		}
		if (warnings.length) {
			process.stdout.write(
				JSON.stringify({
					hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: format(file, warnings) },
				}),
			);
		}
		return 0;
	} catch {
		return 0;
	}
}

if (require.main === module) process.exitCode = main();

module.exports = { isPatternFile };
