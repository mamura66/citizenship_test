# Held back pending a licence question

Content in here is **complete and verified** but must not be published, sold, synced to
the website, or committed to the public repository until somebody with legal training has
looked at it.

Nothing in `apps/us-citizenship/content/` is subject to this; that directory is the
publishable content and `tools/sync-content.sh` copies all of it to the website. That is
precisely why these files are not in there.

## es-ccse — Spain, CCSE (300 questions)

Extracted verbatim from the official *Manual de preparación CCSE 2026* published free by
Instituto Cervantes. The extraction is sound and independently validated — see
`es-ccse/SOURCES.md` and `es-ccse/validate.py`.

**The problem is not the content. It is the terms.** The manual itself carries no reuse
clause, only a copyright line and a NIPO number. But the legal notice governing the site
it is published on says, verbatim:

> El acceso a dichos contenidos o elementos a través de cervantes.org no otorga por tanto
> a los usuarios ningún derecho sobre los mismos, y no podrán alterarlos, modificarlos,
> **explotarlos, reproducirlos, distribuirlos, ni comunicarlos públicamente** ni podrán
> ejercitar ningún otro derecho que corresponda al titular del derecho afectado.

Read plainly, that withholds exactly what a paid product needs: reproduction,
distribution, and public communication. Verified directly at
https://cervantes.org/es/aviso-legal on 7 September 2026, not taken second-hand.

Two further facts a lawyer should weigh, and one that matters commercially:

- Instituto Cervantes is a Spanish public body (Ley 7/1991) and the manual carries a NIPO,
  marking it an official publication — Ley 37/2007 on the reuse of public-sector
  information may bear on this.
- **Instituto Cervantes publishes its own free official CCSE app.** Selling this pack
  would compete directly with the rights holder's own product, which tends to make a
  permissive reading harder to rely on.

**What I did not do:** form a legal opinion, or ask Instituto Cervantes for permission.
Asking is the obvious next step and costs nothing but an email.

## Why this is in a folder rather than deleted

The extraction was difficult and is correct — see the kerning defect documented in
`es-ccse/NOTES.md`, where a PDF library was dropping spaces after capital letters and
turning "Todos" into "T odos". Throwing that away and redoing it after a licence arrives
would be wasteful. Holding it costs nothing.
