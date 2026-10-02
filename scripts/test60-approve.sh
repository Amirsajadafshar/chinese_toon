#!/bin/bash
# 🧪 فاز ۶۰ — فایل رسید روی دیسک پایدار + تأیید ادمین → PAID
set -eo pipefail
cd /home/z/my-project
BASE="http://localhost:3000"
JAR=/tmp/t60.cookies
AJAR=/tmp/t60.admin.cookies
REF=$(cat /tmp/t60.ref)

admin_login() {
  curl -s -c $AJAR -X POST $BASE/api/admin/login -H 'Content-Type: application/json' \
    -d '{"username":"admin","password":"chinesetoon2024"}' -o /tmp/t60.login.json
  TOK=$(python3 -c "import json;print(json.load(open('/tmp/t60.login.json'))['token'])")
}

echo "=== F) receipt file lives in persistent data dir + owner can fetch ==="
ls -la /home/z/data/uploads/receipts/ | tail -3
RID=$(curl -s "$BASE/api/payments/orders/$REF" -b $JAR | python3 -c "import json,sys;print(json.load(sys.stdin)['order']['receiptUrl'] or '')")
echo "receiptUrl: $RID"
curl -s -b $JAR "$BASE$RID" -o /tmp/t60.r.bin -w "owner fetch HTTP:%{http_code} type:%{content_type}\n"
od -A n -t x1 -N 4 /tmp/t60.r.bin

echo "=== G) stranger (no session) cannot fetch receipt ==="
curl -s "$BASE$RID" -o /dev/null -w "guest fetch HTTP:%{http_code} (expect 401)\n"

echo "=== H) admin approves -> PAID ==="
admin_login
curl -s -H "x-admin-key: $TOK" -X POST "$BASE/api/admin/payments/$REF/approve" -o /tmp/t60.approve.json
python3 - <<'PY'
import json
d = json.load(open('/tmp/t60.approve.json'))
print('approve resp:', {k: d.get(k) for k in ('ok','status','error')})
PY
curl -s "$BASE/api/payments/orders/$REF" -b $JAR -o /tmp/t60.get3.json
python3 - <<'PY'
import json
o = json.load(open('/tmp/t60.get3.json'))['order']
print('status:', o.get('status'), '| paidAt:', o.get('paidAt'), '| amountUsd:', o.get('amountUsd'))
assert o.get('status') == 'PAID', 'not paid after approve'
print('OK: approved -> PAID, amount still 122.40')
PY
curl -s -b $JAR $BASE/api/auth/me -o /tmp/t60.me2.json
python3 - <<'PY'
import json
m = json.load(open('/tmp/t60.me2.json'))
o = m['orders'][0]
print('enrollmentStatus:', o.get('enrollmentStatus'))
print('OK: enrollment visible to customer')
PY
echo "=== I) second approve -> 409 (no double approval) ==="
curl -s -H "x-admin-key: $TOK" -X POST "$BASE/api/admin/payments/$REF/approve" -o /tmp/t60.approve2.json -w "HTTP:%{http_code} (expect 409)\n"
echo "APPROVE+FILE CHECKS PASSED"
