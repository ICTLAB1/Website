# Off-page SEO artefacts

Things that live outside the website but are worth keeping under version
control, because the alternative is one person's browser history.

## `disavow.txt`

The list of referring domains this site asks Google to ignore, in the format
[Search Console's disavow tool](https://search.google.com/search-console/disavow-links)
accepts. **Uploading replaces the previous file**, so this is always the whole
list rather than an addition to it.

It is committed here, rather than only uploaded, for the reason any
configuration is committed: six months from now the question "what did we
disavow, and why?" has an answer, and whoever asks it can see the anchor text
that prompted it without re-running an audit.

### Why there is one at all

As of 11 October 2026 the site had 1,023 referring domains, of which 967 of the
first 1,000 scored 40 or worse for spam and none scored above 10 for authority.
943 links from 931 domains carried the anchor *"Premium Backlink Services
techzoidtechnologies.com for Stronger Google Rankings"*. New domains were
appearing at 80–90 a day and still were on the day the file was written.

The header of `disavow.txt` records this in full, including what a disavow file
does and does not achieve — read it before uploading, because the honest
expectation is that it changes no ranking by itself.

### Regenerating it

The attack was ongoing when this was written, so the file is a snapshot and
will fall behind. To bring it up to date:

1. Export the current referring domains. Search Console's own
   **Links → Top linking sites → Export** is the source that needs no
   subscription; any backlink tool's domain export works too.
2. Keep the domains that are obviously the same campaign — the cheap-TLD
   pattern (`.website`, `.store`, `.site`, `.shop`, `.online`, `.space`) and
   anything carrying the anchor above.
3. Add them to the `domain:` list, keep the header current, and re-upload.

Do not automate this against a credential. A disavow file tells Google to
discount links permanently, and a script that adds domains unattended is a
script that will eventually discount a real one.

### Before relying on it

Check **Search Console → Security & Manual Actions → Manual actions**. If there
is a manual action, the disavow is part of answering it and a reconsideration
request is the other part. If there is not, the disavow is insurance and the
useful work is upstream: finding out who is creating these links. A supplier
adding ninety domains a day will always outrun a file maintained by hand.
