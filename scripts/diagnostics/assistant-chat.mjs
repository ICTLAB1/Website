/**
 * One real conversation with the live assistant.
 *
 * Everything else about this feature can be proved without spending anything:
 * the widget is in the markup, the endpoint refuses a post with no CSRF token,
 * the privacy policy says what it should. None of that proves the assistant
 * answers — the model call sits behind an API key this repository has never
 * seen, and the failure modes that matter most are on the far side of it: a key
 * that was revoked, a model id the account cannot use, a tool that throws in
 * production because the row it reads is shaped differently there.
 *
 * So this sends one message, as a visitor would, and prints the reply in full.
 *
 * ## What it asserts, and what it only reports
 *
 * Asserted: the post is accepted, a non-empty reply comes back, and the server
 * issues a conversation id. Those are mechanical and a failure is unambiguous.
 *
 * Reported, not asserted: whether the reply names the product and calls its
 * price tentative. That is the behaviour the system prompt asks for and it is
 * worth a human reading, but a model's wording varies, and a suite that fails
 * on a synonym teaches people to ignore it. The reply is printed so the
 * judgement can be made by somebody rather than guessed at here.
 *
 * ## Why it is off by default
 *
 * It costs a model call and it writes a conversation row that then shows up in
 * Admin → Chat conversations beside real visitors' questions. Neither is a
 * reason not to have it; both are reasons not to run it on every dispatch of
 * the read-only diagnostics. Set `CHAT=1`.
 *
 * It asks a product question and gives no name or email, so the assistant has
 * nothing to capture — this cannot create a lead in the pipeline.
 */

const SITE = (process.env.SITE ?? "https://techzoidtechnologies.com").replace(/\/$/, "");

if (process.env.CHAT !== "1") {
  console.log("Assistant conversation: skipped (set CHAT=1 to spend one model call)");
  process.exit(0);
}

const QUESTION = "What is Microsoft 365 Business Standard, and what does it cost?";

const results = [];
const check = (label, ok, detail = "") => {
  results.push({ label, ok });
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}${ok || !detail ? "" : `\n          ${detail}`}`);
};

console.log("\nOne real conversation with the assistant");

/*
 * The token is issued by the request proxy as a readable cookie and has to be
 * echoed in a header — the same double submit the widget's own `postJson`
 * does. Read off a GET of the home page, which is where a visitor would get
 * it.
 */
const landing = await fetch(`${SITE}/`, { headers: { "user-agent": "techzoid-live-diagnostics" } });
const setCookie = landing.headers.getSetCookie?.() ?? [];
const csrf = setCookie
  .map((cookie) => /(?:^|;\s*)csrf_token=([^;]+)/.exec(cookie)?.[1])
  .find((value) => Boolean(value));

check("the home page issues a CSRF token", Boolean(csrf), "no csrf_token cookie in the response");

if (!csrf) {
  console.log("\nWithout a token there is nothing to post; stopping here.");
  process.exit(1);
}

let status = 0;
let payload = null;
/*
 * Timed, because the time is the diagnosis.
 *
 * `createMessage` aborts at thirty seconds, so a failure that takes about that
 * long means the container never reached the API — egress, DNS, a firewall. A
 * failure in about a second means it reached it and was turned away, which is
 * a rejected key, a model the account cannot use, or a malformed request. The
 * widget tells a visitor neither of those things, and rightly, but somebody
 * reading this needs to know which half to look in, and the container log is
 * not always to hand.
 */
const started = Date.now();
try {
  const response = await fetch(`${SITE}/api/chat`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "user-agent": "techzoid-live-diagnostics",
      // Both halves of the double submit, plus the Origin the endpoint checks.
      origin: SITE,
      cookie: `csrf_token=${csrf}`,
      "x-csrf-token": csrf,
    },
    body: JSON.stringify({
      messages: [{ role: "user", content: QUESTION }],
      startedOn: "/ (live diagnostics)",
    }),
  });
  status = response.status;
  payload = await response.json().catch(() => null);
} catch (error) {
  check("the chat endpoint answers", false, String(error));
  process.exit(1);
}

const elapsed = Date.now() - started;

check(
  "the post is accepted",
  status === 200,
  `status ${status} after ${(elapsed / 1000).toFixed(1)}s` +
    `${payload ? ` — ${JSON.stringify(payload).slice(0, 300)}` : ""}` +
    (status === 200
      ? ""
      : elapsed > 20_000
        ? "\n          Twenty seconds or more: the container did not reach the API. Look at egress, DNS and any firewall in front of it."
        : "\n          A second or two: the API was reached and refused the request. Look at the stored key, the model id, and the tool definitions."),
);

/*
 * `{ ok, data }`, which is the envelope every route here answers in — not the
 * payload itself. Reading `payload.reply` would find undefined and report a
 * missing reply on a conversation that worked perfectly.
 */
const data = payload?.data ?? null;
const reply = typeof data?.reply === "string" ? data.reply : "";
check("a reply comes back", reply.trim().length > 0, "the response carried no reply text");
check(
  "and the server issues a conversation id",
  typeof data?.conversationId === "string" && data.conversationId.length > 0,
  "no conversationId: the turn was answered but not stored",
);

if (reply) {
  console.log(`\n  asked:  ${QUESTION}`);
  console.log(`  replied: ${reply}\n`);
  console.log(
    `  for a human to judge: names the product — ${/business standard/i.test(reply) ? "yes" : "no"}; ` +
      `calls the price tentative — ${/tentative/i.test(reply) ? "yes" : "no"}`,
  );
}

const failed = results.filter((result) => !result.ok).length;
console.log(`\n${results.length - failed}/${results.length} assistant checks passed`);

if (failed > 0) {
  console.log(
    "\nA failure here is on the far side of the API key, which is the one part\n" +
      "of this feature the repository cannot see. Check Admin → Settings for a\n" +
      "stored key, and the container log for what the model call returned.",
  );
}

process.exit(failed ? 1 : 0);
