BASE=http://localhost:3000
pass=0; fail=0
ok(){ printf "  ✓ %s\n" "$1"; pass=$((pass+1)); }
no(){ printf "  ✗ %s — %s\n" "$1" "$2"; fail=$((fail+1)); }

login(){ local jar="$1"; curl -s -c "$jar" -o /dev/null "$BASE/"
  local t; t=$(grep -oP 'csrf_token\s+\K\S+' "$jar" | tail -1)
  curl -s -b "$jar" -c "$jar" -X POST "$BASE/api/auth/login" -H "content-type: application/json" \
    -H "origin: $BASE" -H "x-csrf-token: $t" --data "{\"email\":\"$2\",\"password\":\"$3\"}" >/dev/null
  echo "$t"; }

# Two separate customers.
A=$(mktemp); B=$(mktemp)
curl -s -c "$A" -o /dev/null "$BASE/"; TA=$(grep -oP 'csrf_token\s+\K\S+' "$A"|tail -1)
EA="atk_a$RANDOM@example.test"
curl -s -b "$A" -c "$A" -X POST "$BASE/api/auth/register" -H "content-type: application/json" -H "origin: $BASE" -H "x-csrf-token: $TA" \
  --data "{\"name\":\"Attacker A\",\"email\":\"$EA\",\"password\":\"CorrectHorse9\",\"companyName\":\"Attacker A Ltd\"}" >/dev/null

# The rate limiter is in-memory and shared by everything talking to this server.
#
# Run this suite after anything that has been placing orders — including a
# person testing by hand — and its own attempts come back 429. That produced
# eleven failures scattered across unrelated sections, none of which said
# "rate limited", and reading them was a waste of an afternoon. So it is
# checked once, up front, and reported for what it is.
probe=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/orders" -H "content-type: application/json" --data '{}')
if [ "$probe" = "429" ]; then
  echo "  RATE LIMITED — this server has taken too many orders recently."
  echo "  The limiter is in memory, so restarting the app clears it:"
  echo "    docker compose -f deploy/docker-compose.prod.yml restart app   (or restart your dev server)"
  echo "  Re-run this suite afterwards. Aborting rather than reporting misleading failures."
  exit 2
fi

# The SKU these tests buy is discovered, not hardcoded.
#
# It used to be MS-M365-BS-A1, a seeded sample. Importing the real price list
# replaced the samples, the SKU stopped existing, and every price-tampering
# test carried on passing — because a 404 for an unknown SKU is also a refusal.
# The suite reported green while proving nothing about price tampering at all.
SKU=$(curl -s "$BASE/products?sort=popular" | grep -oP '/buy\?sku=\K[A-Za-z0-9._-]+' | head -1)
if [ -z "$SKU" ]; then
  echo "  NO PURCHASABLE SKU — the catalogue offers nothing that can be bought directly."
  echo "  Every pricing test below would pass without testing anything. Aborting."
  exit 2
fi
echo "  (buying $SKU)"

echo "== Direct purchase pricing cannot be tampered =="
R=$(curl -s -b "$A" -X POST "$BASE/api/orders" -H "content-type: application/json" -H "origin: $BASE" -H "x-csrf-token: $TA" \
  --data '{"sku":"'"$SKU"'","quantity":2,"contactName":"Attacker A","companyName":"Attacker A Ltd","contactEmail":"a@example.test","contactPhone":"9999999999","unitPriceMinor":1,"totalMinor":1,"discountMinor":99999999,"status":"FULFILLED"}')
REF=$(echo "$R" | grep -oP '"reference":"\K[^"]+')
[ -n "$REF" ] && ok "direct order created ($REF)" || no "direct order" "$R"

TOTAL=$(su postgres -c "psql -tA -d ictlab -c \"select \\\"totalMinor\\\" from \\\"Order\\\" where reference='$REF'\"" 2>/dev/null | tr -d ' ')
#
# The expected figure is derived from the catalogue, not written down here.
#
# It used to be the literal 2784800 — two seats of a sample SKU. Once the SKU
# became whatever the catalogue currently sells, a hardcoded number could only
# ever be wrong, and the useful assertion is the one this test was always
# about: the server priced the order from its own records and ignored the
# unitPriceMinor of 1 the request asked for.
EXPECTED=$(su postgres -c "psql -tA -d ictlab -c \"select round(2 * least(coalesce(nullif(\\\"salePriceMinor\\\",0), \\\"listPriceMinor\\\"), \\\"listPriceMinor\\\") * (100 + \\\"gstRatePercent\\\") / 100.0) from \\\"ProductVariant\\\" where sku='$SKU'\"" 2>/dev/null | tr -d ' ')
[ -n "$TOTAL" ] && [ "$TOTAL" = "$EXPECTED" ] && ok "price recomputed server-side ($TOTAL paise, not the 1 that was asked for)" || no "price tampering" "stored=$TOTAL expected=$EXPECTED"

ST=$(su postgres -c "psql -tA -d ictlab -c \"select status from \\\"Order\\\" where reference='$REF'\"" 2>/dev/null | tr -d ' ')
[ "$ST" = "PENDING" ] && ok "injected status ignored (stored PENDING)" || no "status injection" "$ST"

DISC=$(su postgres -c "psql -tA -d ictlab -c \"select \\\"discountMinor\\\" from \\\"Order\\\" where reference='$REF'\"" 2>/dev/null | tr -d ' ')
[ "$DISC" = "0" ] && ok "injected discount ignored" || no "discount injection" "$DISC"

echo "== Enquiry-only products cannot be bought directly =="
R=$(curl -s -b "$A" -X POST "$BASE/api/orders" -H "content-type: application/json" -H "origin: $BASE" -H "x-csrf-token: $TA" \
  --data '{"sku":"HPE-DL380-CFG","quantity":1,"contactName":"Attacker A","companyName":"Attacker A Ltd","contactEmail":"a@example.test","contactPhone":"9999999999"}')
echo "$R" | grep -q '"code":"conflict"' && ok "enquiry-only SKU refused for direct purchase" || no "enquiry-only bypass" "$R"

R=$(curl -s -o /dev/null -w "%{http_code}" -b "$A" "$BASE/buy?sku=HPE-DL380-CFG")
[ "$R" = "404" ] && ok "buy page 404s for an enquiry-only SKU" || no "buy page" "got $R"
R=$(curl -s -o /dev/null -w "%{http_code}" -b "$A" "$BASE/buy?sku=DOES-NOT-EXIST")
[ "$R" = "404" ] && ok "buy page 404s for an unknown SKU" || no "unknown sku" "got $R"

echo "== Negative and absurd quantities =="
R=$(curl -s -b "$A" -X POST "$BASE/api/orders" -H "content-type: application/json" -H "origin: $BASE" -H "x-csrf-token: $TA" \
  --data '{"sku":"'"$SKU"'","quantity":-10,"contactName":"Attacker A","companyName":"Attacker A Ltd","contactEmail":"a@example.test","contactPhone":"9999999999"}')
echo "$R" | grep -q '"code":"validation_failed"' && ok "negative quantity rejected" || no "negative quantity" "$R"

echo "== CSRF still enforced on the new endpoint =="
R=$(curl -s -b "$A" -X POST "$BASE/api/orders" -H "content-type: application/json" -H "origin: $BASE" \
  --data '{"sku":"'"$SKU"'","quantity":1,"contactName":"A B","companyName":"Acme Ltd","contactEmail":"a@example.test","contactPhone":"9999999999"}')
echo "$R" | grep -q '"code":"forbidden"' && ok "order without CSRF header rejected" || no "order CSRF" "$R"

echo "== Cross-tenant quote access =="
QREF=$(su postgres -c "psql -tA -d ictlab -c \"select reference from \\\"Quote\\\" where status='SENT' or status='ACCEPTED' order by \\\"createdAt\\\" desc limit 1\"" 2>/dev/null | tr -d ' ')
if [ -n "$QREF" ]; then
  C=$(curl -s -o /dev/null -w "%{http_code}" -b "$A" "$BASE/account/quotes/$QREF")
  [ "$C" = "404" ] && ok "another tenant's quotation 404s ($QREF)" || no "quote IDOR" "got $C"
else
  no "cross-tenant quote" "no quote to test with"
fi

echo "== Draft quotations are invisible to the customer =="
# Draft a quote for A's own enquiry, then confirm A cannot see it before it is sent.
ADM=$(mktemp); TADM=$(login "$ADM" "admin@example.test" "ChangeMe!Admin123")
ENQ=$(curl -s -b "$A" -X POST "$BASE/api/enquiries" -H "content-type: application/json" -H "origin: $BASE" -H "x-csrf-token: $TA" \
  --data '{"contactName":"Attacker A","companyName":"Attacker A Ltd","contactEmail":"a@example.test","contactPhone":"9999999999","items":[{"sku":"'"$SKU"'","quantity":3}]}' | grep -oP '"reference":"\K[^"]+')
DRAFT=$(su postgres -c "psql -tA -d ictlab -c \"insert into \\\"Quote\\\" (id,reference,status,\\\"enquiryId\\\",\\\"userId\\\",currency,\\\"subtotalMinor\\\",\\\"discountMinor\\\",\\\"taxMinor\\\",\\\"totalMinor\\\",\\\"createdAt\\\",\\\"updatedAt\\\") select 'atk'||floor(random()*100000)::text,'QTE-2026-D'||upper(substr(md5(random()::text),1,5)),'DRAFT',e.id,e.\\\"userId\\\",'INR',1000,0,180,1180,now(),now() from \\\"Enquiry\\\" e where e.reference='$ENQ' returning reference\"" 2>/dev/null | tr -d ' ' | head -1)
if [ -n "$DRAFT" ]; then
  C=$(curl -s -o /dev/null -w "%{http_code}" -b "$A" "$BASE/account/quotes/$DRAFT")
  [ "$C" = "404" ] && ok "own DRAFT quotation is hidden from the customer" || no "draft visible" "got $C"
else
  no "draft test" "could not create fixture"
fi

echo "== Customer cannot reach admin quote/order screens =="
for p in "/admin/quotes/$QREF" "/admin/orders"; do
  B1=$(curl -s -b "$A" -L "$BASE$p")
  echo "$B1" | grep -q "could not be found" && ok "customer blocked from $p" || no "customer $p" "reachable"
done

echo "== Admin CRUD framework: privilege boundary and resource whitelist =="

# A SALES account must not reach ADMIN-only content resources.
SALES_EMAIL="atk_sales$RANDOM@example.test"
SC=$(mktemp); curl -s -c "$SC" -o /dev/null "$BASE/"
STC=$(grep -oP 'csrf_token\s+\K\S+' "$SC"|tail -1)
curl -s -b "$SC" -c "$SC" -X POST "$BASE/api/auth/register" -H "content-type: application/json" -H "origin: $BASE" -H "x-csrf-token: $STC" \
  --data "{\"name\":\"Atk Sales\",\"email\":\"$SALES_EMAIL\",\"password\":\"CorrectHorse9\",\"companyName\":\"Atk Ltd\"}" >/dev/null
su postgres -c "psql -tA -d ictlab -c \"update \\\"User\\\" set role='SALES' where email='$SALES_EMAIL'\"" >/dev/null 2>&1
SJ=$(mktemp); curl -s -c "$SJ" -o /dev/null "$BASE/"
STJ=$(grep -oP 'csrf_token\s+\K\S+' "$SJ"|tail -1)
curl -s -b "$SJ" -c "$SJ" -X POST "$BASE/api/auth/login" -H "content-type: application/json" -H "origin: $BASE" -H "x-csrf-token: $STJ" \
  --data "{\"email\":\"$SALES_EMAIL\",\"password\":\"CorrectHorse9\"}" >/dev/null

# The fixture, before anything is concluded from it.
#
# Every check below reads a status code from this session, and a session that
# never signed in returns 307 to /login for all of them — which reads as "SALES
# cannot reach the admin content" (correct, for the wrong reason) and as "SALES
# has lost the pipeline" (wrong, and nothing to do with roles). That is exactly
# what happened when the sign-up limiter ran out mid-gate. A broken fixture is
# now named as one.
SALES_ROLE=$(su postgres -c "psql -tA -d ictlab -c \"select role from \\\"User\\\" where email='$SALES_EMAIL'\"" 2>/dev/null | tr -d '[:space:]')
code=$(curl -s -o /dev/null -w "%{http_code}" -b "$SJ" "$BASE/account")
if [ "$SALES_ROLE" = "SALES" ] && [ "$code" = "200" ]; then
  ok "the SALES fixture exists and is signed in"
else
  no "SALES fixture" "role='$SALES_ROLE', /account returned $code — the checks below cannot mean anything"
fi

blocked=1
for r in brands categories services posts faqs banners; do
  code=$(curl -s -o /dev/null -w "%{http_code}" -b "$SJ" "$BASE/admin/$r")
  [ "$code" = "200" ] && blocked=0
done
[ $blocked -eq 1 ] && ok "SALES cannot reach any ADMIN-only content resource" || no "SALES content access" "at least one returned 200"

# Business identity is ADMIN-only: it writes the address, the GSTIN and the
# statutorily-required grievance officer, all of which appear on legal pages.
code=$(curl -s -o /dev/null -w "%{http_code}" -b "$SJ" "$BASE/admin/settings")
[ "$code" != "200" ] && ok "SALES cannot reach the business identity settings (got $code)" || no "SALES settings access" "got 200"

# The CRM integration points this business's commercial data at a URL. That is
# an integration credential, not a sales screen, so it sits with the others.
code=$(curl -s -o /dev/null -w "%{http_code}" -b "$SJ" "$BASE/admin/settings/crm")
[ "$code" != "200" ] && ok "SALES cannot reach the CRM integration settings (got $code)" || no "SALES CRM settings access" "got 200"

# The pipeline is the opposite case: sales work happens there all day, and an
# admin-only pipeline is one the sales team keeps in a spreadsheet instead.
code=$(curl -s -o /dev/null -w "%{http_code}" -b "$SJ" "$BASE/admin/pipeline")
[ "$code" = "200" ] && ok "SALES keeps the pipeline" || no "SALES pipeline access" "got $code"

# The scheduled delivery route both triggers outbound HTTP and reports what is
# queued. It must not be reachable by a signed-in staff session either — the
# token is the only key, and 404 rather than 401 so a prober learns nothing.
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST -b "$SJ" "$BASE/api/crm/deliver")
[ "$code" = "404" ] && ok "CRM delivery route is closed to a staff session with no token" || no "CRM delivery route" "got $code"
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "x-crm-token: guess" "$BASE/api/crm/deliver")
[ "$code" = "404" ] && ok "CRM delivery route refuses a guessed token" || no "CRM delivery token" "got $code"

# SALES keeps its own commercial surfaces.
code=$(curl -s -o /dev/null -w "%{http_code}" -b "$SJ" "$BASE/admin/enquiries")
[ "$code" = "200" ] && ok "SALES keeps its commercial surfaces" || no "SALES enquiries" "got $code"

# An unknown resource key must 404 rather than fall back to a default.
code=$(curl -s -o /dev/null -w "%{http_code}" -b "$ADM" "$BASE/admin/users-secret")
[ "$code" = "404" ] && ok "unknown admin resource 404s" || no "unknown resource" "got $code"

# Products are not in the generic registry, so the generic route must not serve them.
code=$(curl -s -o /dev/null -w "%{http_code}" -b "$ADM" "$BASE/admin/products/new")
[ "$code" = "200" ] && ok "products keep their bespoke screens" || no "products screen" "got $code"

echo "== Sign-up cannot be used to hammer one address =="

# The per-address limit, which is the one that protects a person: repeating a
# sign-up at somebody else's address is how you find out whether they have an
# account, and how you bury them in confirmation mail. Four attempts at one
# address; the fourth must be refused.
FLOOD_EMAIL="atk_flood$RANDOM@example.test"
FC=$(mktemp); curl -s -c "$FC" -o /dev/null "$BASE/"
FTC=$(grep -oP 'csrf_token\s+\K\S+' "$FC"|tail -1)
flood_code() {
  curl -s -o /dev/null -w "%{http_code}" -b "$FC" -X POST "$BASE/api/auth/register" \
    -H "content-type: application/json" -H "origin: $BASE" -H "x-csrf-token: $FTC" \
    --data "{\"name\":\"Atk Flood\",\"email\":\"$FLOOD_EMAIL\",\"password\":\"CorrectHorse9\",\"companyName\":\"Atk Ltd\"}"
}
first=$(flood_code); flood_code >/dev/null; flood_code >/dev/null; fourth=$(flood_code)
[ "$first" = "200" ] && ok "a first sign-up at a fresh address is accepted" || no "sign-up" "got $first"
[ "$fourth" = "429" ] && ok "a fourth sign-up at the same address is refused" || no "sign-up flood" "got $fourth"

# And exactly one account exists, however many times it was asked for.
count=$(su postgres -c "psql -tA -d ictlab -c \"select count(*) from \\\"User\\\" where email='$FLOOD_EMAIL'\"" 2>/dev/null | tr -d '[:space:]')
[ "$count" = "1" ] && ok "and only one account was ever created" || no "duplicate accounts" "$count rows"
su postgres -c "psql -tA -d ictlab -c \"delete from \\\"User\\\" where email like 'atk_flood%'\"" >/dev/null 2>&1

echo "== The inbound CRM webhook is closed to anyone without the secret =="

# The endpoint that lets another system change this pipeline. `crm-inbound.mjs`
# proves it works with the secret; this proves it does nothing without one, from
# the outside, with no fixture and nothing switched on for it.
for probe in \
  '-H "content-type: application/json"' \
  '-H "x-crm-signature: t=1,v1=deadbeef"' \
  '-H "x-crm-signature: garbage"' ; do
  code=$(eval curl -s -o /dev/null -w "%{http_code}" -X POST $probe \
    --data "'"'"{\"version\":1,\"id\":\"atk\",\"kind\":\"deal.won\",\"occurredAt\":\"2026-01-01T00:00:00Z\",\"entity\":{\"type\":\"Deal\",\"id\":\"ANY\"},\"data\":{}}"'"'" \
    "$BASE/api/crm/inbound")
  [ "$code" = "404" ] && ok "inbound webhook refuses an unsigned or forged delivery (got $code)" \
    || no "inbound webhook" "got $code"
done

# And nothing it refused was recorded as an event, which would otherwise let an
# outsider fill this table.
count=$(su postgres -c "psql -tA -d ictlab -c \"select count(*) from \\\"CrmInboundEvent\\\" where id = 'atk'\"" 2>/dev/null | tr -d '[:space:]')
[ "$count" = "0" ] && ok "and wrote nothing to the inbound log" || no "inbound log" "$count row(s)"

echo "== Payments: an order cannot be marked paid without a gateway signature =="

# A payment attempt, written straight into the database so no gateway is needed.
# Everything below is about what this system will believe, which is entirely our
# own code.
PAY_ORDER="atk_order_$RANDOM"
PAY_REF="ORD-2026-A$(head -c4 /dev/urandom | od -An -tx1 | tr -d ' \n' | tr 'abcdef' 'ABCDEF' | head -c5)"
psqlq() { su postgres -c "psql -tA -d ictlab -c \"$1\"" 2>/dev/null | tr -d ' \r' | head -1; }

psqlq "insert into \\\"Order\\\" (id,reference,status,currency,\\\"subtotalMinor\\\",\\\"discountMinor\\\",\\\"taxMinor\\\",\\\"totalMinor\\\",\\\"billingName\\\",\\\"billingEmail\\\",\\\"placedAt\\\",\\\"createdAt\\\",\\\"updatedAt\\\") values ('$PAY_ORDER','$PAY_REF','PENDING','INR',9000000,0,0,9000000,'Atk','atk@example.test',now(),now(),now())" >/dev/null
psqlq "insert into \\\"Payment\\\" (id,\\\"orderId\\\",provider,\\\"providerOrderId\\\",status,\\\"amountMinor\\\",currency,mode,\\\"createdAt\\\",\\\"updatedAt\\\") values ('atk_pay_$RANDOM','$PAY_ORDER','razorpay','order_atk_$PAY_ORDER','CREATED',9000000,'INR','TEST',now(),now())" >/dev/null

# Whether the gateway is switched on changes what these two prove, so it is
# stated rather than left for somebody to work out from the status codes. With
# it on, a 403 proves the signature was checked and rejected. With it off, the
# request is refused earlier, for a different reason — still refused, but not
# evidence about the signature. The definitive signature tests are in
# `npm run verify:payments`, which switches the gateway on with a known secret
# precisely so it can prove that part.
GATEWAY=$(psqlq "select enabled from \\\"PaymentSettings\\\" where id='singleton'")
[ "$GATEWAY" = "t" ] && echo "  (gateway on: signature rejection is what is being tested)" \
                     || echo "  (gateway off: these prove refusal, not signature checking)"

# 1. A forged checkout signature.
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/payments/verify" -H "content-type: application/json" \
  --data "{\"razorpay_order_id\":\"order_atk_$PAY_ORDER\",\"razorpay_payment_id\":\"pay_atk\",\"razorpay_signature\":\"$(printf 'a%.0s' $(seq 64))\"}")
[ "$code" = "403" ] || [ "$code" = "409" ] && ok "a forged payment signature never marks an order paid (got $code)" || no "forged signature" "got $code"

# 2. An unsigned webhook.
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/payments/webhook" -H "content-type: application/json" \
  --data "{\"event\":\"payment.captured\",\"payload\":{\"payment\":{\"entity\":{\"id\":\"pay_atk\",\"order_id\":\"order_atk_$PAY_ORDER\",\"amount\":9000000}}}}")
[ "$code" != "200" ] && ok "an unsigned webhook never marks an order paid (got $code)" || no "unsigned webhook" "got 200"

# 3. Neither of them moved any money.
st=$(psqlq "select status from \\\"Order\\\" where id='$PAY_ORDER'")
[ "$st" = "PENDING" ] && ok "the order is still unpaid after both attempts" || no "order state" "got $st"

# 4. Starting a payment for somebody else's order needs more than its reference.
code=$(curl -s -o /dev/null -w "%{http_code}" -b "$A" -X POST "$BASE/api/payments/start" -H "content-type: application/json" -H "origin: $BASE" -H "x-csrf-token: $TA" \
  --data "{\"reference\":\"$PAY_REF\"}")
[ "$code" = "404" ] && ok "a customer cannot start a payment for an order that is not theirs (got $code)" || no "cross-account payment start" "got $code"

# 5. And not without CSRF either.
code=$(curl -s -o /dev/null -w "%{http_code}" -b "$A" -X POST "$BASE/api/payments/start" -H "content-type: application/json" \
  --data "{\"reference\":\"$PAY_REF\"}")
[ "$code" = "403" ] && ok "starting a payment without a CSRF token is refused" || no "payment start CSRF" "got $code"

# 6. Signed out entirely.
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/payments/start" -H "content-type: application/json" \
  --data "{\"reference\":\"$PAY_REF\"}")
[ "$code" = "403" ] || [ "$code" = "401" ] && ok "starting a payment while signed out is refused (got $code)" || no "anonymous payment start" "got $code"

psqlq "delete from \\\"Payment\\\" where \\\"orderId\\\"='$PAY_ORDER'" >/dev/null
psqlq "delete from \\\"Order\\\" where id='$PAY_ORDER'" >/dev/null

echo
echo "passed: $pass  failed: $fail"
[ $fail -eq 0 ]
