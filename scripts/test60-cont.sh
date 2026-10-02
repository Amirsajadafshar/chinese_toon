#!/bin/bash
# 🧪 فاز ۶۰ — ادامهٔ تست: سفارش + ادمین (از کوکی‌های موجود استفاده می‌کند)
set -eo pipefail
cd /home/z/my-project
BASE="http://localhost:3000"
JAR=/tmp/t60.cookies
AJAR=/tmp/t60.admin.cookies

echo "=== 6) create order (no code) -> final amount must be 122.40 ==="
ORD=""
for i in 1 2 3 4; do
  curl -s --max-time 60 -b $JAR -X POST $BASE/api/payments/orders -H 'Content-Type: application/json' \
    -d '{"productId":"beginner-chinese-12"}' -o /tmp/t60.order.json
  if head -c1 /tmp/t60.order.json | grep -q '{'; then ORD=ok; break; fi
  echo "retry $i (compile?)"; sleep 4
done
[ "$ORD" = ok ] || { echo "ORDER FAILED"; head -c 300 /tmp/t60.order.json; exit 1; }
python3 - <<'PY'
import json
d = json.load(open('/tmp/t60.order.json')); o = d.get('order', {})
print('ref:', o.get('ref'))
print('amountUsd:', o.get('amountUsd'), '| baseAmount:', o.get('baseAmount'), '| tier%:', o.get('tierPercent'), '| method:', o.get('paymentMethod'))
assert abs(float(o.get('amountUsd', '0')) - 122.40) < 0.001, f"WRONG FINAL AMOUNT: {o.get('amountUsd')}"
print('OK: order final amount = 122.40 (server snapshot)')
PY
REF=$(python3 -c "import json;print(json.load(open('/tmp/t60.order.json'))['order']['ref'])")

echo "=== 7) GET order -> same authoritative amount ==="
curl -s --max-time 60 "$BASE/api/payments/orders/$REF" -b $JAR -o /tmp/t60.get.json
python3 - <<'PY'
import json
o = json.load(open('/tmp/t60.get.json'))['order']
print('GET amountUsd:', o.get('amountUsd'), '| status:', o.get('status'), '| method:', o.get('paymentMethod'))
assert abs(float(o.get('amountUsd', '0')) - 122.40) < 0.001, 'GET amount mismatch'
print('OK: payment page amount = 122.40')
PY

echo "=== 8) /api/auth/me orders -> amount shown to customer ==="
curl -s -b $JAR $BASE/api/auth/me -o /tmp/t60.me.json
python3 - <<'PY'
import json
d = json.load(open('/tmp/t60.me.json')); os_ = d.get('orders', [])
o = os_[0] if os_ else {}
print('me order amountUsd:', o.get('amountUsd'), '| status:', o.get('status'))
assert abs(float(o.get('amountUsd', '0')) - 122.40) < 0.001, 'account amount mismatch'
print('OK: account page amount = 122.40')
PY

echo "=== 9) admin login + dashboard + users + detail ==="
curl -s --max-time 60 -c $AJAR -X POST $BASE/api/admin/login -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"chinesetoon2024"}' -o /tmp/t60.login.json
python3 - <<'PY'
import json
print('admin token ok:', bool(json.load(open('/tmp/t60.login.json')).get('token')))
PY
TOK=$(python3 -c "import json;print(json.load(open('/tmp/t60.login.json'))['token'])")
curl -s -H "x-admin-key: $TOK" $BASE/api/admin/dashboard -o /tmp/t60.dash.json
python3 - <<'PY'
import json
d = json.load(open('/tmp/t60.dash.json'))
print('users:', d['users']['total'], '| registrations:', d['registrations']['total'], '| orders.total:', d['orders']['total'], '| unpaid:', d['orders']['unpaid'], '| pendingReview:', d['orders'].get('pendingReview'))
PY
TUID=$(python3 -c "import json;print(json.load(open('/tmp/t60.me.json'))['user']['id'])")
curl -s -H "x-admin-key: $TOK" "$BASE/api/admin/users/$TUID" -o /tmp/t60.detail.json
python3 - <<'PY'
import json
d = json.load(open('/tmp/t60.detail.json')); u = d['user']
print('detail code:', u.get('uniqueCode'), '| dob:', u.get('dateOfBirth'), '| leads:', len(d.get('leads', [])))
l = (d.get('leads') or [{}])[0]
print('lead fields: goal=', l.get('goal'), '| days=', l.get('preferredDays'), '| tz=', l.get('timezone'))
assert u.get('uniqueCode') and u.get('dateOfBirth'), 'detail missing code/dob'
assert l.get('goal') and l.get('preferredDays'), 'lead missing persisted fields'
print('OK: admin student detail shows real persisted data')
PY
echo "$REF" > /tmp/t60.ref
echo "ORDER+ADMIN CHECKS PASSED"
