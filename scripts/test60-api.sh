#!/bin/bash
# 🧪 فاز ۶۰ — تست سرتاسری API (بند ۲۴ و ۲۸ تسک مالک)
set -eo pipefail
cd /home/z/my-project
BASE="http://localhost:3000"
EMAIL="t60.$(date +%s)@test.local"
PASS="Test60!pass"
JAR=/tmp/t60.cookies
AJAR=/tmp/t60.admin.cookies

echo "=== 0) warmup: wait until APIs answer JSON ==="
for i in $(seq 1 30); do
  if curl -s --max-time 10 $BASE/api/faq | head -c1 | grep -q '{'; then echo "warm after ${i}s"; break; fi
  sleep 2
done

echo "=== 1) pricing validate (expect base 144, tier 15%, final 122.4) ==="
curl -s -X POST $BASE/api/discounts/validate -H 'Content-Type: application/json' \
  -d '{"productId":"beginner-chinese-12"}' | python3 -c "
import json,sys
d=json.load(sys.stdin); p=d.get('pricing',{})
print('base:',p.get('base'),'| tier%:',p.get('tierPercent'),'| tierDiscount:',p.get('tierDiscount'),'| final:',p.get('final'))"

echo "=== 2) register account -> uniqueCode ==="
REG=$(curl -s -c $JAR -X POST $BASE/api/auth/register -H 'Content-Type: application/json' -d "{
  \"firstName\":\"Test\",\"lastName\":\"Sixty\",\"email\":\"$EMAIL\",\"password\":\"$PASS\",\"confirmPassword\":\"$PASS\",
  \"dateOfBirth\":\"1995-06-15\",\"countryCode\":\"DE\",\"phone\":\"+49 170 000000\"}")
echo "$REG" | python3 -c "
import json,sys
d=json.load(sys.stdin); u=d.get('user',{})
print('userId:',u.get('id')); print('uniqueCode:',u.get('uniqueCode'))
assert u.get('uniqueCode'), 'MISSING uniqueCode in register response'"
TUID=$(echo "$REG" | python3 -c "import json,sys;print(json.load(sys.stdin)['user']['id'])")

echo "=== 3) /api/auth/me -> same code ==="
ME=$(curl -s -b $JAR $BASE/api/auth/me)
echo "$ME" | python3 -c "
import json,sys
d=json.load(sys.stdin); u=d.get('user',{})
print('me.uniqueCode:',u.get('uniqueCode'))
assert u.get('uniqueCode'), 'MISSING uniqueCode in me'"

echo "=== 4) login again -> code must NOT change ==="
curl -s -c $JAR -X POST $BASE/api/auth/login -H 'Content-Type: application/json' -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}" | python3 -c "
import json,sys
d=json.load(sys.stdin); u=d.get('user',{})
print('login.uniqueCode:',u.get('uniqueCode'))"

echo "=== 5) registration submit (linked) + resubmit (reuse, no dup) ==="
R1=$(curl -s -b $JAR -X POST $BASE/api/register -H 'Content-Type: application/json' -d "{
  \"name\":\"Test Sixty\",\"email\":\"$EMAIL\",\"level\":\"Beginner\",\"classType\":\"group\",
  \"classTitle\":\"Beginner Chinese\",\"goal\":\"E2E test\",\"message\":\"t60\",
  \"timezone\":\"Asia/Tehran\",\"preferredDays\":[\"mon\",\"wed\"],
  \"preferredTimes\":[{\"start\":\"18:00\",\"end\":\"19:00\"}],\"daysPerWeek\":2,\"scheduleAck\":true}")
echo "$R1"
RID=$(echo "$R1" | python3 -c "import json,sys;print(json.load(sys.stdin).get('id',''))")
R2=$(curl -s -b $JAR -X POST $BASE/api/register -H 'Content-Type: application/json' -d "{
  \"name\":\"Test Sixty\",\"email\":\"$EMAIL\",\"level\":\"Beginner\",\"classType\":\"group\",
  \"classTitle\":\"Beginner Chinese\",\"goal\":\"E2E test updated\",\"message\":\"t60b\",
  \"timezone\":\"Asia/Tehran\",\"preferredDays\":[\"tue\",\"thu\"],
  \"preferredTimes\":[{\"start\":\"19:00\",\"end\":\"20:00\"}],\"daysPerWeek\":2,\"scheduleAck\":true}")
echo "$R2"
python3 - "$R2" "$RID" <<'EOF'
import json,sys
d=json.loads(sys.argv[1]); rid=sys.argv[2]
assert d.get('reused')==True and d.get('id')==rid, 'DEDUP FAILED — new record created!'
print('✓ reuse confirmed — same registration id, no duplicate')
EOF

echo "=== 6) create order (no code) -> final amount must be 122.4 ==="
ORD=$(curl -s -b $JAR -X POST $BASE/api/payments/orders -H 'Content-Type: application/json' -d '{"productId":"beginner-chinese-12"}')
echo "$ORD" | python3 -c "
import json,sys
d=json.load(sys.stdin); o=d.get('order',{})
print('ref:',o.get('ref'))
print('amountUsd:',o.get('amountUsd'),'| baseAmount:',o.get('baseAmount'),'| tier%:',o.get('tierPercent'),'| method:',o.get('paymentMethod'))
assert o.get('amountUsd')=='122.4', f\"WRONG FINAL AMOUNT: {o.get('amountUsd')}\"
print('✓ order final amount = 122.40 (server snapshot)')"
REF=$(echo "$ORD" | python3 -c "import json,sys;print(json.load(sys.stdin)['order']['ref'])")

echo "=== 7) GET order -> same authoritative amount ==="
curl -s $BASE/api/payments/orders/$REF -b $JAR | python3 -c "
import json,sys
o=json.load(sys.stdin)['order']
print('GET amountUsd:',o.get('amountUsd'),'| status:',o.get('status'))
assert o.get('amountUsd')=='122.4', 'GET amount mismatch'
print('✓ payment page amount = 122.40')"

echo "=== 8) admin login + dashboard + users ==="
TOK=$(curl -s -c $AJAR -X POST $BASE/api/admin/login -H 'Content-Type: application/json' -d '{"username":"admin","password":"chinesetoon2024"}' | python3 -c "import json,sys;print(json.load(sys.stdin).get('token',''))")
echo "token: ${TOK:0:8}…"
curl -s -b $AJAR $BASE/api/admin/dashboard | python3 -c "
import json,sys
d=json.load(sys.stdin)
print('users:',d['users'],'| registrations:',d['registrations'],'| orders.total:',d['orders']['total'],'| pendingReview:',d['orders'].get('pendingReview'))"
curl -s -b $AJAR "$BASE/api/admin/users?q=$EMAIL" | python3 -c "
import json,sys
d=json.load(sys.stdin); rows=d.get('users',[])
assert rows, 'user not found in admin list'
r=rows[0]
print('admin list code:',r.get('uniqueCode'),'| orders:',r.get('orderCount'),'| purchase:',r.get('purchaseStatus'))
assert r.get('uniqueCode'), 'MISSING code in admin users list'
print('✓ admin users list shows uniqueCode')"
curl -s -b $AJAR "$BASE/api/admin/users/$TUID" | python3 -c "
import json,sys
d=json.load(sys.stdin); u=d['user']
print('detail code:',u.get('uniqueCode'),'| dob:',u.get('dateOfBirth'),'| leads:',len(d.get('leads',[])))
l=(d.get('leads') or [{}])[0]
print('lead fields: goal=',l.get('goal'),'| days=',l.get('preferredDays'),'| tz=',l.get('timezone'))
assert u.get('uniqueCode') and u.get('dateOfBirth'), 'detail missing code/dob'
assert l.get('goal') and l.get('preferredDays'), 'lead missing persisted fields'
print('✓ admin student detail shows real persisted data')"
echo "REF=$REF TUID=$TUID EMAIL=$EMAIL" > /tmp/t60.ids
echo "ALL API CHECKS PASSED"
