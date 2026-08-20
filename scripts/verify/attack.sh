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

echo "== Direct purchase pricing cannot be tampered =="
R=$(curl -s -b "$A" -X POST "$BASE/api/orders" -H "content-type: application/json" -H "origin: $BASE" -H "x-csrf-token: $TA" \
  --data '{"sku":"MS-M365-BS-A1","quantity":2,"contactName":"Attacker A","companyName":"Attacker A Ltd","contactEmail":"a@example.test","contactPhone":"9999999999","unitPriceMinor":1,"totalMinor":1,"discountMinor":99999999,"status":"FULFILLED"}')
REF=$(echo "$R" | grep -oP '"reference":"\K[^"]+')
[ -n "$REF" ] && ok "direct order created ($REF)" || no "direct order" "$R"

TOTAL=$(su postgres -c "psql -tA -d ictlab -c \"select \\\"totalMinor\\\" from \\\"Order\\\" where reference='$REF'\"" 2>/dev/null | tr -d ' ')
# 2 x 11,800 = 23,600 + 18% GST = 27,848 -> 2784800 paise
[ "$TOTAL" = "2784800" ] && ok "price recomputed server-side (₹27,848 not ₹0.01)" || no "price tampering" "totalMinor=$TOTAL"

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
  --data '{"sku":"MS-M365-BS-A1","quantity":-10,"contactName":"Attacker A","companyName":"Attacker A Ltd","contactEmail":"a@example.test","contactPhone":"9999999999"}')
echo "$R" | grep -q '"code":"validation_failed"' && ok "negative quantity rejected" || no "negative quantity" "$R"

echo "== CSRF still enforced on the new endpoint =="
R=$(curl -s -b "$A" -X POST "$BASE/api/orders" -H "content-type: application/json" -H "origin: $BASE" \
  --data '{"sku":"MS-M365-BS-A1","quantity":1,"contactName":"A B","companyName":"Acme Ltd","contactEmail":"a@example.test","contactPhone":"9999999999"}')
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
  --data '{"contactName":"Attacker A","companyName":"Attacker A Ltd","contactEmail":"a@example.test","contactPhone":"9999999999","items":[{"sku":"MS-M365-BS-A1","quantity":3}]}' | grep -oP '"reference":"\K[^"]+')
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

echo
echo "passed: $pass  failed: $fail"
[ $fail -eq 0 ]
