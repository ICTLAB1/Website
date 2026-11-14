# Seven tactics, assessed — and the two worth doing

Assessed 11 November 2026 against Google's published spam policies, this
site's own brief, and its measured backlink profile.

## The short answer

| Tactic | Verdict |
| --- | --- |
| Local Citations | **Do it.** Legitimate, and there is a concrete gap to close first. |
| Social Profiles | **Do it.** Three exist; completing them is entity-building. |
| EMD (exact-match domain) | **Don't.** Obsolete since 2012, and actively harmful here. |
| Parasite Ranking | **Don't.** Named in Google's site reputation abuse policy. |
| Backlinks — Mostly Free | **Don't.** A link scheme, onto a profile that already has one. |
| Web 2.0 | **Don't.** A link scheme by another name. |
| Reddit Profiles | **Don't.** Astroturfing; against Reddit's rules and Google's. |

Four of the seven are the specific thing the brief that started this work
ruled out, in its own words: *"Never use automated spam backlinks, paid link
schemes, PBN networks or fake reviews"* and *"Follow Google's published search
guidelines and use sustainable, white-hat SEO methods."* That instruction is
the reason they are declined here, and it was the right instruction.

## Why the four are worse than useless for this domain specifically

This is not a general caution. On 7 November the backlink index returned a
**spam score of 28** for techzoidtechnologies.com, and the anchor-text
distribution contained this, across **24 backlinks from 24 separate referring
domains**:

> "High Quality Dofollow Backlinks DA 50 PA 40 Premium PBN Network Service
> techzoidtechnologies.com Rank First Page Google Fast SEO Link Building Buy
> Backlinks Online Cheap"

Roughly a quarter of the referring domains are already a private blog network
footprint. The open question recorded in
`docs/seo-competitor-and-keyword-gap.md` — whether somebody bought link
building, or a network scraped the domain — is still open.

Adding "mostly free backlinks", Web 2.0 properties and Reddit profile links on
top of that is not a neutral experiment. It is adding more of the signal that
may already be suppressing the domain, and it converts an ambiguous footprint
("a spam network scraped us") into an unambiguous pattern ("they are building
this deliberately"). The downside is a manual action, and a manual action
would cost more than everything gained in this engagement so far.

### Each, briefly

**EMD.** Buying `microsoft365resellerindia.com` and ranking it. Google's EMD
update devalued this in 2012, and a second domain splits authority rather than
adding it — which matters here, because this site has *just* finished
consolidating `www` onto the apex and is still recovering the 20 keywords that
split cost it. A separate domain for the same business is also a doorway-site
risk. The whole idea is a decade past its sell-by date.

**Parasite ranking.** Publishing on a high-authority third-party domain to
borrow its ranking. Google introduced the **site reputation abuse** policy in
March 2024 specifically for this, and has been issuing manual actions under it
since. This is no longer a grey area.

**Backlinks — mostly free.** Directory and profile links at volume. This is
what Google's link spam policy calls a link scheme. See above for why this
domain is the worst possible candidate for it.

**Web 2.0.** Blogger, WordPress.com and Tumblr properties created to link back.
The same policy, the same outcome, and the properties themselves carry no
authority worth borrowing.

**Reddit profiles.** Profile links and seeded posts. Against Reddit's own
rules, and the links are `nofollow` anyway, so even on its own terms the
tactic does not do what it claims. Genuine participation in a relevant
subreddit is a different thing entirely and is not something to automate.

---

# The two that are worth doing

## 1. Local citations

A citation is a mention of the business's **name, address and phone number**
on a third-party site. Their value is consistency: search engines use
agreement across many sources as evidence the business is real and located
where it says. Inconsistency is what does damage, not absence.

### Close this gap first

The `Organization` structured data on every page currently carries the name
and address and **no telephone and no email**:

```
name      : TechZoid Technologies Private Limited
address   : 407, 4th floor, Pearl Business Park,
            Netaji Subhash Place, Pitampura, New Delhi, Delhi 110034, India
telephone : (absent)
email     : (absent)
```

Meanwhile `/contact` shows `tel:9711492098` and `sales@techzoidtechnologies.com`.

This is not a code fault. `src/lib/seo.tsx:258` emits the telephone whenever
one is configured — `config.phone.sales` is simply unset. **Set the sales
phone in the admin settings and it appears in the structured data on every
page automatically.**

Enter it in international form, `+91 97114 92098`, for two reasons: the
footer and chat widget strip spaces to build `tel:` links, so that becomes
`+919711492098`, which is what a phone dials correctly from anywhere; and
every citation below should carry the identical string. A number written three
ways across three directories is three businesses as far as a crawler is
concerned.

### The canonical record

Every listing should use exactly this, character for character:

| Field | Value |
| --- | --- |
| Name | TechZoid Technologies Private Limited |
| Address line 1 | 407, 4th Floor, Pearl Business Park |
| Address line 2 | Netaji Subhash Place, Pitampura |
| City / State | New Delhi, Delhi |
| Postcode | 110034 |
| Country | India |
| Phone | `+91 97114 92098` *(confirm before use)* |
| Email | sales@techzoidtechnologies.com |
| Website | https://techzoidtechnologies.com |

Note the website is the **apex**, never `www.` — `www` 301s, and a citation
pointing at a redirect wastes the signal.

Confirm the phone is the right public number before it goes anywhere. A
number published across forty directories is difficult to change later.

### Where to list, in priority order

**Tier 1 — do these first.**

1. **Google Business Profile** — the single highest-value listing. Checklist below.
2. **Bing Places** — far less traffic, trivial to do, feeds Bing and Copilot.
3. **Apple Business Connect** — feeds Apple Maps and Siri.

**Tier 2 — Indian business directories that carry real weight.**

4. **IndiaMART** — genuinely used for B2B software and hardware procurement.
5. **JustDial**
6. **Sulekha**
7. **TradeIndia**
8. **ExportersIndia**

**Tier 3 — real affiliations only, where membership exists.**

9. **GeM seller profile** — already a registered seller; make sure the public profile is complete and consistent.
10. **Udyam / MSME directory** — the registration already exists.
11. **Startup India profile** — likewise.
12. Any **chamber of commerce or trade association** actually belonging to.

Tier 3 is where the real differentiation is, because those are affiliations
competitors cannot simply sign up for. They are also already held — this is
about making existing facts findable, not acquiring anything.

**Do not** buy a bulk citation package. They produce listings on dead
directories with mangled details, and mangled details are worse than no
listing at all.

### Google Business Profile checklist

- [ ] Claim and verify the listing at the Pitampura address
- [ ] Primary category: **Software company** (or Computer consultant — pick one that matches what buyers search)
- [ ] Secondary categories: Computer store, Business to business service
- [ ] Hours, including a correct holiday schedule
- [ ] Phone: the canonical number above
- [ ] Website: `https://techzoidtechnologies.com` — the apex
- [ ] Description mentioning Microsoft, Adobe, Autodesk licensing and Delhi NCR — written for a reader, not stuffed
- [ ] Service areas: Delhi, Noida, Gurugram, Greater Noida, Ghaziabad, Faridabad
- [ ] Photographs: the office, the team, the premises — real ones
- [ ] Products/services listing the main licensing lines
- [ ] **A review request process for genuine customers.** Never incentivised, never written by anyone but the customer. Fake reviews are the fastest route to losing the listing entirely.
- [ ] Answer the Q&A section yourself with real questions buyers ask
- [ ] Post updates occasionally — new offerings, not filler

## 2. Social profiles

Three are already declared in the `Organization` structured data and are
therefore already telling Google these accounts are the same entity:

- `in.linkedin.com/company/techzoid-technologies-private-limited`
- `facebook.com/ttpldelhi/`
- `instagram.com/techzoidtechnologies/`

The work is not creating more. It is making these three complete and
consistent, and adding only those that will actually be maintained.

**Worth completing.** LinkedIn is the one that matters for B2B procurement:
full company description, the Pitampura address, website link, logo and banner,
employees associated with the page. A buyer checking whether a supplier is real
looks there before anywhere else.

**Worth adding, if they will be kept up.** YouTube (licensing explainer videos
would suit the articles just published), and X/Twitter.

**Not worth adding.** Anything that will sit empty. An abandoned profile with
two posts from 2024 is evidence of a business that stopped, which is the
opposite of what a citation is for.

Each new profile added should also be added to the `sameAs` list in the site
configuration, so the structured data continues to claim the full set.

### Why this helps beyond the links

The links themselves are `nofollow` and pass no ranking signal. The value is
**entity consistency**: Google's knowledge graph builds a picture of "TechZoid
Technologies Private Limited" from agreeing sources, and AI search systems —
which the brief specifically asked about — lean heavily on that same
consistency when deciding whether a business is real enough to cite.

That is also why the four declined tactics are counterproductive rather than
merely useless: inconsistent, low-quality mentions actively muddy the entity.

---

## What to do about the PBN footprint

Still the open question, and it outranks everything above.

1. Establish whether link-building was ever purchased for this domain. If it was, stop it.
2. If it was not, the footprint is a network that scraped the domain — common, and usually ignorable, but worth monitoring.
3. Either way, prepare a disavow file for the 24 PBN domains and the Pinterest-tool cluster, and keep it ready. Submit it if rankings stay suppressed after the current work has had time to land.

A disavow is not urgent and is not free — submitted carelessly it can remove
links that were helping. It is worth preparing and holding rather than firing
off.
