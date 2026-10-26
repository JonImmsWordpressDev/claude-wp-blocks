---
name: refresh-page
description: Rebuild an existing page's content from an edited block pattern file, after confirming the post by ID.
argument-hint: <pattern-slug> <post-id>
disable-model-invocation: true
---

Rebuild a post's content from a block pattern in the active theme. Editing a pattern file never updates pages that already use it, so this copies the pattern in again.

Arguments: `$ARGUMENTS`

Follow these steps in order. Target the post by ID only, NEVER by title.

1. Read the pattern slug and post ID from the arguments. The slug is the file name in the theme's `patterns/` folder without `.php`. If either is missing, ask for it and stop.

2. Check WP-CLI works for this site: run `wp --info`, then `wp core is-installed`.
   If `wp` isn't found, or this folder isn't inside a WordPress install, tell the user how to fix it and stop:
   - Run Claude from the site's root folder, or
   - Tell you the WordPress root so you can add `--path=<wp root>` to each `wp` command, or
   - On Local, open the site shell (right-click the site → Open site shell) and start Claude there.
   Don't guess a path.

3. Show the user what would change. Run:

   ```bash
   wp eval-file "${CLAUDE_PLUGIN_ROOT}/scripts/refresh-page.php" <slug> <post-id>
   ```

   This changes nothing. Show its output (post ID, title, type and status) and ask the user to confirm that post ID. If the script reports an error, show it and stop.

4. Only after the user confirms, run it again with `confirm`:

   ```bash
   wp eval-file "${CLAUDE_PLUGIN_ROOT}/scripts/refresh-page.php" <slug> <post-id> confirm
   ```

   Report the line it prints. WordPress saves a revision, so the user can undo it from the post's Revisions screen.
