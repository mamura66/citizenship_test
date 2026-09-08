# Four emails that unblock four countries

> **Decision, 8 September 2026 — three of these four are superseded. Send only Spain.**
>
> The UK, Canada and Australia emails asked permission to reproduce official question
> pools. For the UK and Canada there is nothing to ask for: **neither government publishes
> its question pool**, so no product in the market has the real questions, including the
> official publisher's own app. TSO's official Life in the UK app says its questions are
> "based on the style and structure of official questions", and Canadian apps ship
> hundreds of questions "based on *Discover Canada*" behind an IRCC non-affiliation notice.
>
> So the route is the one everybody else already takes, and it is lawful for the reason it
> is lawful for them: questions we write ourselves, testing **facts** drawn from the free
> official study guide. Facts are not copyrightable; the guide's wording is. Two rules make
> that safe, and `tools/validate-content-pack.py` now enforces the first:
>
> 1. `contentType: "authored-practice"`, with `basedOn` (the official material, with its
>    URL) and `nonAffiliation` (in plain words: not official, not the real questions).
>    A pack of this type may not carry `officialNumber` on any question - that field only
>    belongs to a real official question, and its presence means either the label or the
>    content is wrong.
> 2. We do not copy a competitor's question bank. Following their *approach* is fine;
>    copying their *questions* infringes a different owner, and several of them sell those
>    banks.
>
> **Australia keeps its 20 official practice questions** - those really are published, under
> CC BY 3.0 AU, and *Our Common Bond* is CC BY 4.0 with explicit commercial use. Attribution
> replaces permission there.
>
> **Spain is different and the email still stands.** Spain *does* publish its 300 CCSE
> questions, and the Instituto Cervantes notice expressly forbids reproducing or
> distributing them. There, permission is the only route - which is why that pack sits in
> `legal-hold/`.


Every country except the United States and Germany is blocked on permission, not on
engineering. Each blocker below is one email. **Drafts only — nothing has been sent, and
nothing should be sent without you reading it first.**

Send from `hello@prepareforcitizenship.com`, which reaches your inbox.

A note on tone across all four: say who you are, say exactly what you want to reproduce,
say that it is commercial, and make it easy to say yes. Do not imply you have already
started, and do not ask for a broad grant when a narrow one will do — a request to
reproduce one published question set is far more likely to be granted than a request for
"rights to your content".

---

## 1. Spain — Instituto Cervantes  ·  **the highest value, send first**

Blocks 252,500 naturalisations a year, the second-largest market in the EU. The content is
already extracted and verified; only the licence stands in the way.

**To:** the CCSE examinations team via https://examenes.cervantes.es (use the contact form
if no address is published) — and copy `informacion@cervantes.es`
**Subject:** Permiso para reproducir las 300 preguntas del Manual CCSE en una aplicación de preparación

> Estimados señores:
>
> Les escribo para solicitar autorización para reproducir las 300 preguntas del *Manual de
> preparación de la prueba CCSE* (edición 2026, NIPO 110-25-054-X) en una aplicación web de
> preparación para la prueba CCSE.
>
> Soy desarrollador independiente. La aplicación se llama Prepare for Citizenship
> (prepareforcitizenship.com) y ya ofrece la preparación del examen de ciudadanía de los
> Estados Unidos. El estudio del material es gratuito; existe un pago único opcional de
> 9,99 USD que da acceso a exámenes de práctica ilimitados.
>
> Mi intención es reproducir las preguntas **literalmente**, sin modificarlas ni
> reformularlas, citando el Instituto Cervantes como fuente en cada pantalla, e indicando
> con claridad que la aplicación es independiente y no está afiliada al Instituto Cervantes
> ni a ninguna administración pública.
>
> Entiendo que el aviso legal de cervantes.org no concede derechos de reproducción ni
> distribución, y por eso les escribo antes de publicar nada en español. Les agradecería
> que me indicaran:
>
> 1. si es posible obtener dicha autorización, y en qué condiciones;
> 2. si el Manual, al ser una publicación oficial con NIPO, está sujeto a la Ley 37/2007
>    sobre reutilización de la información del sector público;
> 3. a qué departamento debo dirigirme si no es el suyo.
>
> Quedo a su disposición para cualquier aclaración.
>
> Atentamente,
> Sandeep Sandha
> hello@prepareforcitizenship.com

**Be prepared for a no.** Instituto Cervantes publishes its own free official CCSE app, so
you are asking a rights holder for permission to compete with its own product. If the
answer is no, Spain is simply off the list — do not ship it anyway.

---

## 2. Canada — IRCC  ·  **cheapest to unblock**

379,530 naturalisations in 2023, the second-largest market overall. Canada.ca permits
non-commercial reuse outright and requires written permission only for commercial use. No
fee is mentioned.

**To:** the copyright administrator named in the Canada.ca terms of use (currently routed
via https://www.canada.ca/en/transparency/terms.html)
**Subject:** Request for written permission — commercial reproduction of *Discover Canada* study questions

> Dear Copyright Administrator,
>
> I am writing to request written permission for the commercial reproduction of a specific,
> limited part of *Discover Canada: The Rights and Responsibilities of Citizenship*
> (Ci1-11/2012E): the 31 study questions published alongside it — the three worked
> multiple-choice questions and the 28 further study questions.
>
> I am an independent developer. My study application, Prepare for Citizenship
> (prepareforcitizenship.com), currently covers the United States civics test. Studying is
> free; there is one optional payment of USD 9.99 for unlimited practice tests, which is
> why the Canada.ca terms require me to seek permission rather than rely on the
> non-commercial provision.
>
> If permission were granted I would:
>
> - reproduce the questions **verbatim**, without rewording or abridgement;
> - attribute Immigration, Refugees and Citizenship Canada as the source on screen, in
>   whatever form you prefer;
> - state clearly and prominently that the application is independent and is not
>   affiliated with, endorsed by, or sponsored by the Government of Canada;
> - make no claim that the questions are the questions asked in the citizenship test, since
>   I understand the actual test questions are not published.
>
> Could you tell me whether such permission can be granted, on what terms, and whether any
> fee applies? If this request should go to another office, I would be grateful to be
> pointed there.
>
> Yours faithfully,
> Sandeep Sandha
> hello@prepareforcitizenship.com

---

## 3. Australia — Home Affairs  ·  **narrow question, likely quick yes**

Australia is already the most defensible of the three: departmental material is Creative
Commons Attribution and *Our Common Bond* is CC BY 4.0, which permits commercial use with
attribution. Only one point is genuinely unclear, so ask only that.

**To:** `comms@homeaffairs.gov.au` (the address given for copyright and licence enquiries)
**Subject:** Licence confirmation — content on citizenshippracticetest.homeaffairs.gov.au

> Dear Communications team,
>
> I would be grateful for written confirmation on a narrow copyright question.
>
> The department's copyright notice states that material presented on the website is
> provided under a Creative Commons Attribution 3.0 Australia licence, and *Our Common
> Bond* (2020) is separately released under CC BY 4.0. The official citizenship practice
> test, however, is served from `citizenshippracticetest.homeaffairs.gov.au`, which does not
> carry a copyright notice of its own.
>
> Could you confirm whether the 20 practice questions on that site fall under the Creative
> Commons Attribution licence described in the departmental notice?
>
> The context: I am an independent developer of a study application, Prepare for Citizenship
> (prepareforcitizenship.com). I would reproduce the practice questions verbatim, attribute
> them to the Australian Government Department of Home Affairs as the licence requires, state
> plainly on screen that they are the official *practice* questions and not the questions
> asked in the test, and state that the application is independent and not affiliated with
> or endorsed by the department. Studying is free; there is one optional payment for
> unlimited practice tests, so the licence's commercial-use position matters to me.
>
> If the practice test site is covered by different terms, I would welcome being told which.
>
> Yours faithfully,
> Sandeep Sandha
> hello@prepareforcitizenship.com

---

## 4. United Kingdom — Home Office / TSO  ·  **send last, expect a number**

The hardest and least likely to pay off. The question pool is confidential Crown copyright
and everything published is a priced TSO product; the practice-questions book retails at
£7.99 against a $9.99 product price, so a per-unit royalty may make the country unviable.

Worth asking anyway, for one reason: the National Archives' register of licensing
delegations already lists *"The Official DVSA Revision Theory Test Question Banks"*. So the
UK government does license question banks — there is a precedent to point at, which is why
the draft below names it.

**To:** the Home Office rights enquiry route, copying `psi@nationalarchives.gov.uk` (the
Crown copyright and re-use team)
**Subject:** Re-use enquiry — Life in the UK official practice questions

> Dear Sir or Madam,
>
> I am writing to ask whether the *Life in the United Kingdom: Official Practice Questions
> and Answers* material can be licensed for re-use in a commercial study application, and if
> so on what terms.
>
> I am an independent developer. Prepare for Citizenship (prepareforcitizenship.com)
> currently covers the United States civics test, where the official question pool is
> published in full. I understand the Life in the UK question pool is not published and is
> administered under contract, and that the published practice material is sold by The
> Stationery Office rather than issued under the Open Government Licence.
>
> I note that The National Archives' register of delegations of authority includes "The
> Official DVSA Revision Theory Test Question Banks", so there appears to be an established
> route for licensing official question material. I would be grateful to know:
>
> 1. whether a licence for the Life in the UK practice questions is available at all;
> 2. the licensing terms and any per-unit or minimum fee;
> 3. whether this enquiry should go to the Home Office, to The Stationery Office, or
>    elsewhere.
>
> I would reproduce any licensed material verbatim and attribute it as required, and would
> state clearly that the application is independent and not affiliated with the Home Office.
>
> Yours faithfully,
> Sandeep Sandha
> hello@prepareforcitizenship.com

---

## What to do with the answers

| Answer | What happens |
|---|---|
| Spain yes | The pack is already built and validated. Move it out of `legal-hold/` and it ships. |
| Spain no | Drop Spain. Do not ship it regardless — and remove it from any roadmap you have published. |
| Canada yes | Build the 31 study questions, labelled as study questions rather than test questions. |
| Australia confirmed | Mark the pack shippable. It is 20 questions, so pair it with the CC BY 4.0 *Our Common Bond* material to make a real product. |
| UK quotes a workable fee | Reconsider. Otherwise the UK needs a visibly different product, with practice questions labelled as ours. |

**Germany needs no email.** German copyright law treats official works differently from a
website's terms of use, and BAMF publishes the catalogue for exactly this purpose — see the
Germany research for the specifics.
