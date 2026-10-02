#!/bin/bash
# 🧪 فاز ۶۰ — تست پایداری واقعی: رسید → ری‌استارت سخت سرور → وارسی مجدد
set -eo pipefail
cd /home/z/my-project
BASE="http://localhost:3000"
JAR=/tmp/t60.cookies
AJAR=/tmp/t60.admin.cookies
REF=$(cat /tmp/t60.ref)
# 🔁 سشن ادمین درون‌حافظه است — با هر restart می‌میرد؛ تابع لاگین تازه
admin_login() {
  curl -s -c $AJAR -X POST $BASE/api/admin/login -H 'Content-Type: application/json' \
    -d '{"username":"admin","password":"chinesetoon2024"}' -o /tmp/t60.login.json
  TOK=$(python3 -c "import json;print(json.load(open('/tmp/t60.login.json'))['token'])")
}
admin_login

echo "=== A) upload receipt (real restart-persistence scenario) ==="
python3 - <<'PY'
# JPEG minimal ولی با هدر/انتهای معتبر — برای تست magic-bytes
jpg = bytes([0xFF,0xD8,0xFF,0xE0]) + b'JFIF' + bytes(256) + bytes([0xFF,0xD9])
open('/tmp/receipt60.jpg','wb').write(jpg)
print('test jpeg bytes:', len(jpg))
PY
curl -s -b $JAR -X POST $BASE/api/receipts -F "ref=$REF" -F "file=@/tmp/receipt60.jpg;type=image/jpeg" -o /tmp/t60.up.json
python3 - <<'PY'
import json
d = json.load(open('/tmp/t60.up.json'))
print('upload resp:', {k: d.get(k) for k in ('ok','status','receiptStatus','error','code')})
if d.get('code') == 'ALREADY_SUBMITTED':
    print('OK: idempotency guard — receipt already under review (from earlier run)')
else:
    assert d.get('ok') or d.get('receiptStatus') == 'PENDING_REVIEW', 'upload failed: ' + str(d)
PY

echo "=== B) order now RECEIPT_SUBMITTED ==="
curl -s "$BASE/api/payments/orders/$REF" -b $JAR -o /tmp/t60.get2.json
python3 - <<'PY'
import json
o = json.load(open('/tmp/t60.get2.json'))['order']
print('status:', o.get('status'), '| receiptStatus:', o.get('receiptStatus'), '| amountUsd:', o.get('amountUsd'))
assert o.get('status') == 'RECEIPT_SUBMITTED', 'not submitted'
print('OK: receipt submitted, order under review')
PY

echo "=== C) RECORD pre-restart snapshot ==="
curl -s -b $JAR $BASE/api/auth/me -o /tmp/t60.pre.me.json
admin_login
curl -s -H "x-admin-key: $TOK" $BASE/api/admin/dashboard -o /tmp/t60.pre.dash.json
python3 - <<'PY'
import json
m = json.load(open('/tmp/t60.pre.me.json'))
print('PRE user:', m['user']['email'], '| code:', m['user']['uniqueCode'], '| orders:', [(o['ref'], o['amountUsd'], o['status']) for o in m['orders']])
d = json.load(open('/tmp/t60.pre.dash.json'))
print('PRE dash: users:', d['users']['total'], '| registrations:', d['registrations']['total'], '| orders:', d['orders']['total'], '| pendingReview:', d['orders'].get('pendingReview'))
PY

echo "=== D) HARD RESTART (simulate redeploy restart) ==="
pkill -f "next dev" || true
sleep 2
cd /home/z/my-project
setsid env DATABASE_URL="file:/home/z/data/chinesetoon.db" CT_DATA_DIR="/home/z/data" NODE_OPTIONS="--max-old-space-size=1400" nohup bun run dev >> dev.log 2>&1 < /dev/null & disown
for i in $(seq 1 30); do
  sleep 2
  if curl -s --max-time 8 $BASE/api/faq 2>/dev/null | head -c1 | grep -q '{'; then echo "server back after ~$((i*2))s"; break; fi
done

echo "=== E) VERIFY after restart: same user/code/order/receipt/count ==="
curl -s -b $JAR $BASE/api/auth/me -o /tmp/t60.post.me.json
python3 - <<'PY'
import json
pre = json.load(open('/tmp/t60.pre.me.json'))
post = json.load(open('/tmp/t60.post.me.json'))
assert pre['user']['id'] == post['user']['id'], 'USER ID CHANGED'
assert pre['user']['uniqueCode'] == post['user']['uniqueCode'], 'UNIQUE CODE CHANGED'
po = post['orders'][0]
print('POST user:', post['user']['email'], '| code:', post['user']['uniqueCode'])
print('POST order:', po['ref'], '| amount:', po['amountUsd'], '| status:', po['status'], '| receiptStatus:', po.get('receiptStatus'))
assert abs(float(po['amountUsd']) - 122.40) < 0.001, 'AMOUNT CHANGED'
assert po['status'] == 'RECEIPT_SUBMITTED', 'RECEIPT STATUS LOST'
print('OK: user + uniqueCode + order + receipt status ALL PERSISTED after restart')
PY
admin_login
curl -s -H "x-admin-key: $TOK" $BASE/api/admin/dashboard -o /tmp/t60.post.dash.json
python3 - <<'PY'
import json
pre = json.load(open('/tmp/t60.pre.dash.json'))
post = json.load(open('/tmp/t60.post.dash.json'))
same = (pre['users']['total'] == post['users']['total'] and
        pre['registrations']['total'] == post['registrations']['total'] and
        pre['orders']['total'] == post['orders']['total'] and
        pre['orders'].get('pendingReview') == post['orders'].get('pendingReview'))
print('POST dash: users:', post['users']['total'], '| registrations:', post['registrations']['total'], '| orders:', post['orders']['total'], '| pendingReview:', post['orders'].get('pendingReview'))
assert same, 'DASHBOARD COUNTS CHANGED AFTER RESTART'
print('OK: admin counts identical after restart')
PY
echo "PERSISTENCE CHECKS PASSED"
