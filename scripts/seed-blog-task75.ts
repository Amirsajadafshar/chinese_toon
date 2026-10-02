// ---------------------------------------------------------------------------
// 📝 Seed ایدمپوتنت ۶ مقالهٔ وبلاگ آموزشی واقعی جدید → جدول Post (فاز ۷۵)
//
// درخواست مالک: «Blog چندتا اضافه کن قبلی ها خوب بودن» — همان الگو و همان کیفیت
// فاز ۶۹ (۷۰۰–۱۱۰۰ کلمه، بخش Takeaway، بدون lorem ipsum) روی موضوعاتی که در
// ۱۴ مقالهٔ موجود پوشش داده نشده بودند.
//
// قالب محتوا دقیقاً مطابق رندرکنندهٔ سایت (blog-parts.tsx):
//   • بلوک‌ها با «یک خط خالی» جدا می‌شوند
//   • بلوکی که با «## » شروع شود تیتر می‌شود (برای فهرست «در این صفحه»)
//   • فقط **بولد** به‌صورت inline پشتیبانی می‌شود
//   • آیتم‌های لیستی هرکدام یک بلوک جدا با پیشوند «• »
//
// ایدمپوتنسی: upsert بر اساس slug یکتا — اجرای دوباره امن است؛ به ۱۴ مقالهٔ
// قبلی و شمارندهٔ views هیچ دست‌زدنی نمی‌شود.
//
// اجرا (env صریح، چون .env به دیتابیس قدیمی اشاره می‌کند):
//   cd /home/z/my-project && DATABASE_URL=file:/home/z/data/chinesetoon.db bun scripts/seed-blog-task75.ts
// ---------------------------------------------------------------------------

import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

interface SeedPost {
  slug: string
  title: string
  tag: 'news' | 'culture' | 'tips' | 'hsk'
  emoji: string
  color: 'sage' | 'butter' | 'peach'
  excerpt: string
  content: string
}

const SEED: SeedPost[] = [
  {
    slug: 'chinese-numbers-explained',
    title: 'Chinese Numbers Explained: Count to 99 in One Sitting (and Why 8 Is Lucky)',
    tag: 'tips',
    emoji: '🔢',
    color: 'sage',
    excerpt:
      'The counting system is pure logic — ten words and one stacking rule give you every number you will ever need. Plus phone numbers, prices, and the superstitions hidden in floors and plates.',
    content: `Numbers are the first thing every traveler wishes they had learned properly. The good news: Chinese numbers are among the most logical in any language — the whole system is a simple pattern you can learn in one sitting, and once it clicks you can say any price, phone number, or date you will ever need. Let's build it piece by piece.

## The Pattern That Builds Everything

Chinese counts the way English almost does. The ten digits are:

• **一 (yī)** — one

• **二 (èr)** — two

• **三 (sān)** — three

• **四 (sì)** — four

• **五 (wǔ)** — five

• **六 (liù)** — six

• **七 (qī)** — seven

• **八 (bā)** — eight

• **九 (jiǔ)** — nine

• **十 (shí)** — ten

After ten, you simply stack them: **十一 (shíyī)** is ten-one — eleven. **二十 (èrshí)** is two-ten — twenty. There is nothing irregular to memorize anywhere in the system, which is why children learning Mandarin often count before they can read a single character.

## Every Number from 11 to 99

Once you see the stacking rule, big numbers assemble themselves:

• **二十一 (èrshíyī)** — twenty-one, literally "two-ten-one."

• **三十五 (sānshíwǔ)** — thirty-five, "three-ten-five."

• **九十九 (jiǔshíjiǔ)** — ninety-nine, "nine-ten-nine."

One hundred is **一百 (yìbǎi)**, and the logic keeps going: **二百五十 (èrbǎi wǔshí)** is 250, and **九百九十九 (jiǔbǎi jiǔshíjiǔ)** is 999. For everyday life — prices, bus lines, addresses, ages — this covers nearly everything you will actually encounter, which is remarkable value for about fifteen minutes of memorization.

## Phone Numbers Have Their Own Rules

Chinese phone numbers are read digit by digit, and one digit changes costume: **1 becomes 幺 (yāo)** instead of 一, because a long, clear yāo cannot be mistaken for **七 (qī, seven)** over a bad phone connection. So 138 is simply yāo-sān-bā. When you give your number, say each digit separately — nobody groups digits the way English speakers do. If someone reads your number back and you hear yāo at the front, they have got it exactly right, and you will hear waiters, cashiers, and delivery riders use 幺 constantly for exactly this reason.

## Prices: 块 and 毛

In daily shopping you will mostly hear **块 (kuài)** — the casual word for yuan — rather than the formal 元. Fifty yuan is **五十块**. Small change uses **毛 (máo)**, a tenth of a kuài: **一块五 (yí kuài wǔ)** means one kuài and five máo. Ask **多少钱？(duōshao qián?)** — how much? — and the answer will be a number you can now decode on the spot. This tiny family of words carries most real transactions in China, from breakfast stalls to taxi rides.

## Why Buildings Skip the Fourth Floor

Numbers in China carry superstitions with real, visible consequences. **四 (sì, four)** sounds uncomfortably close to **死 (sǐ, death)**, so many buildings label their floors 3, 3A, 5 — or simply jump straight past four. Meanwhile **八 (bā, eight)** rhymes with **发 (fā, to prosper)**, making it the golden number: phone numbers and license plates full of 8s sell at a premium. **六 (liù, six)** suggests smooth sailing, **九 (jiǔ, nine)** echoes 久 (long-lasting) — and on the Chinese internet, **666** means awesome, while **520 (wǔ èr líng)** sounds like I love you. You will spot all of these hiding in prices, wedding dates, and username choices.

## Hand Gestures Count Too

In noisy markets, Chinese speakers often count on one hand — and the gestures are not what you may guess. Six is thumb and pinky stretched wide, eight is thumb and index finger like a pretend gun, ten is two crossed index fingers or a raised fist. Vendors use these constantly across counters, so watch hands as much as mouths. The gestures form a complete second number system that everyone in China shares, and using one correctly earns instant, delighted reactions.

## The Takeaway

Learn the ten digits and the stacking rule, and you can already say almost every number you need. Practice on restaurant prices first, then on your own phone number using 幺 for 1. And when an elevator skips a floor or a price is stuffed with eights, smile — you are now reading a small piece of Chinese culture hidden inside arithmetic.`,
  },
  {
    slug: 'order-food-in-chinese',
    title: 'How to Order Food in Chinese: A Real-World Survival Guide',
    tag: 'tips',
    emoji: '🍜',
    color: 'butter',
    excerpt:
      '我要这个 and four other phrases that take you from menu panic to a full table — spice levels, drinks, the bill, and the polite fight over who pays.',
    content: `Menus in China rarely translate well, waiters rarely hover, and yet ordering food in Chinese is one of the easiest real-world victories a learner can win. You need a handful of phrases, the confidence to point, and one cultural secret: pointing at the next table's dish is completely normal. Here is your survival kit, from sitting down to paying up.

## Start with the Word That Opens Everything

The single most useful food phrase in Mandarin is **我要这个 (wǒ yào zhège)** — I'll have this one. Point at the menu, the plastic dish in the window, or the noodles arriving at your neighbor's table, and this sentence does the rest. Add **和 (hé, and)** to stack your order: **我要这个和那个 (wǒ yào zhège hé nàge)** — I'll take this and that. Nobody expects a flawless sentence in a busy restaurant; clarity wins, and pointing plus this phrase wins fastest.

## Call the Server Politely

Unlike in the West, servers in China do not circle your table. Raise your hand and call **服务员！(fúwùyuán!)** — server! — warmly rather than loudly. It feels blunt to English ears the first time; it is completely standard in China, the same way "excuse me" is at home. In small family places, catching someone's eye and lifting the menu works just as well. The same person will bring food, refill tea, and eventually bring the bill when called.

## Spice, Allergies, and Other Deal-Breakers

Two characters will save more meals than any grammar: **辣 (là, spicy)** and **不 (bù, not)**. Sichuan and Hunan dishes can be deliciously dangerous, so ask before you commit:

• **有点儿辣吗？(yǒudiǎnr là ma?)** — Is it a little spicy?

• **不要辣 (bú yào là)** — No spice, please.

• **少放点儿辣 (shǎo fàng diǎnr là)** — Go light on the chili.

Vegetarians and allergy sufferers can build on the same pattern with nouns: **我不吃肉 (wǒ bù chī ròu)** — I don't eat meat; **我对花生过敏 (wǒ duì huāshēng guòmǐn)** — I'm allergic to peanuts. Swap 花生 for any ingredient and the sentence still works, which makes it one of the highest-value patterns in this whole article.

## Drinks, Rice, and the Grammar of Bowls

Drinks and staples arrive with tiny counting words you will hear constantly:

• **一杯水 (yì bēi shuǐ)** — a glass of water

• **一瓶啤酒 (yì píng píjiǔ)** — a bottle of beer

• **一碗米饭 (yì wǎn mǐfàn)** — a bowl of rice

• **一杯茶 (yì bēi chá)** — a cup of tea

The small words 杯, 瓶, and 碗 are measure words — Chinese counts objects through their container or shape, a system that deserves its own article. One more cultural note: **热水 (rè shuǐ)**, hot water, is the default drink for many Chinese diners, it is always free, and asking for it marks you as someone who understands the local rhythm.

## The Bill and the Honorable Fight

When you finish, wave and say **买单 (mǎidān)** or **结账 (jiézhàng)** — the bill, please. Do not look for the check to arrive on its own, and do not leave a tip: tipping is not customary in China, and a waiter sprinting after you to return change is honesty, not rudeness. With friends, you may witness a polite wrestling match over who pays. **我请客 (wǒ qǐngkè)** means it's my treat, **AA制 (AA zhì)** means we split the bill, and losing the fight gracefully is a perfectly respectable outcome — refusing once or twice before accepting is part of the ritual.

## The Words That Earn Smiles

A little flavor vocabulary turns transactions into conversations. **好吃！(hǎochī!)** — delicious! — is the highest-impact two syllables you can spend in any restaurant, and the cook genuinely will hear about it. **太贵了 (tài guì le)** — too expensive — belongs to street-food banter, and **慢慢吃 (màn man chī)** — eat slowly, take your time — is what hosts say with real care; it has no tidy English translation, which is exactly why it matters.

## The Takeaway

Learn 我要这个, 服务员, 不要辣, and 买单, and you can eat your way through any city in China without opening a translation app once. Add a loud 好吃! when the food lands and you stop being a tourist — you become a guest. Restaurants reward brave attempts far more than perfect grammar; the worst case is extra chili, and the best case is a table that keeps refilling your tea.`,
  },
  {
    slug: 'pinyin-pronunciation-tricky-sounds',
    title: 'Pinyin Pronunciation: The Sounds That Trick English Speakers (and How to Fix Them)',
    tag: 'tips',
    emoji: '🔤',
    color: 'peach',
    excerpt:
      "c is 'ts,' q is 'ch,' and ü changes everything — the real traps in pinyin, decoded once, plus a one-week training plan for your ears and mouth.",
    content: `Pinyin looks friendly — same alphabet, right? Then day one delivers qī, zhōng, and nǚ, and that confidence evaporates. The truth is the opposite of what it feels like: pinyin is a precise, logical spelling system, and almost every confusing moment comes from reading it with English eyes. Here are the traps, decoded once and forever.

## Pinyin Letters Are Not English Letters

The alphabet is borrowed, but the sounds are Mandarin's own. The most famous surprises:

• **c** is a sharp "ts" — **cài (菜, dish)** sounds like "tsai," never like "kai."

• **q** is a "ch" made with a wide, flat tongue forward — **qī (七, seven)**.

• **x** is a soft "sh" with the tongue low and the lips smiling — **xǐhuān (喜欢, to like)**.

• **zh, ch, sh** curl the tongue back and sound heavier than their English cousins — **zhōng (中, middle)**.

Notice the pattern hiding in plain sight: q and x are simply the flat-tongue partners of ch and sh. Group them mentally and the whole map shrinks to something you can hold in your head at once.

## The Six Vowels Do the Heavy Lifting

Mandarin has six basic vowel sounds: a, o, e, i, u, and the famous **ü**. Five are close enough to English; ü is the outsider, and it matters more than beginners expect. Say "ee" and then round your lips as if whistling — that is ü. It changes real words: **nǐ (你, you)** versus **nǚ (女, female)**. One golden rule saves dozens of headaches: after j, q, x, and y, the written u is secretly ü — **jù (句, sentence)** is "jü," not "ju." Once you accept that rule, words like 去 (qù, to go) and 卷 (juǎn, to roll) suddenly sound right.

## The Pairs Everyone Mixes Up

Three pairs cause most of the pain, and all three are fixable with a week of focused listening:

• **zh / ch / sh** (curled tongue) versus **z / c / s** (flat tongue): **zhàn (站, to stand)** against **zàn (赞, to praise)**. Start saying s, then slowly slide your tongue tip back and up — that slide is the entire trick.

• **b / d / g** versus **p / t / k**: the second trio fires with a strong puff of air. Hold a tissue in front of your mouth — 爸 (bà, dad) keeps it still, 怕 (pà, afraid) makes it jump.

• **-ian** versus **-an**: **tiān (天, sky)** sounds like "tyen," not "tyan." The i sneaks a y-glide in between.

## Secret Contractions Nobody Announces

Pinyin compresses some syllables without telling anyone. **iu** is really iou — **liù (六, six)** is closer to "lyoh" than "lee-oo." **ui** is really uei — **shuǐ (水, water)** sounds like "shway," not "shoo-ee." **un** is really uen. These contracted spellings show up in some of the most common words in the language — six, water, 会 (huì, can) — so learn them as finished syllables in their own right instead of sounding out letter by letter, and your speech stops sounding stilted.

## How to Actually Train Your Ear and Mouth

Reading rules get you approximately right; your ears take you the rest of the way. Shadow native audio: play one sentence, then repeat it immediately, matching rhythm and melody rather than hunting perfect vowels. Record yourself on minimal pairs like **四 (sì, four)** and **是 (shì, to be)**, then compare honestly with the original. Use the tone-pair method from our tones guide at the same time — syllables and tones train exactly the same way: in pairs, out loud, a few minutes daily for one week. Your mouth is a muscle, and muscles learn by moving, not by reading.

## The Takeaway

Treat pinyin as a precise map with a handful of local street-name exceptions, not as English wearing Chinese clothes. Master c, q, x, ü, the aspirated p/t/k pairs, and the contracted iu/ui/un syllables, and roughly ninety percent of your mispronunciations disappear in one stroke. Twenty minutes of shadowing a day for a single week will do more than a month of silent reading — and the first time a taxi driver understands your destination without repetition, you will feel the difference everywhere at once.`,
  },
  {
    slug: 'chinese-measure-words-guide',
    title: "Measure Words Explained: Why 'One Book' Needs Two Words in Chinese",
    tag: 'tips',
    emoji: '📦',
    color: 'sage',
    excerpt:
      '一本书, 一杯茶, 一张票 — the small words between numbers and nouns follow a shape logic English speakers already know. Meet the six that cover most of daily life.',
    content: `Try to say "one book" in Chinese and your sentence breaks on purpose: you must say **一本书 (yì běn shū)** — one-BEN-book. Measure words (量词, liàngcí) sit between the number and the noun, and every noun comes with its favorite one. It sounds intimidating until you see the logic: Chinese sorts objects by shape and category — and English already does exactly the same thing in disguise.

## English Already Does This

English speakers use classifiers every day without noticing: two **cups** of coffee, three **sheets** of paper, a **head** of lettuce. Nobody says "two cups coffees." Chinese simply runs this system everywhere, for every noun, in every sentence. Far from being arbitrary decoration, the measure word adds information — it announces what kind of thing is being counted before you even hear the noun itself, which is genuinely useful in a language full of short, similar-sounding words.

## 个: The Universal Default

If you forget everything else from this article, remember **个 (gè)**. It is the default measure word for people and for most round or abstract things:

• **一个人 (yí gè rén)** — a person

• **一个问题 (yí gè wèntí)** — a question

• **一个朋友 (yí gè péngyou)** — a friend

A waiter will absolutely understand **一个米饭** even though the proper word is 碗 — and the smile you get will be a kind one, not a mocking one. Use 个 freely while your vocabulary grows; upgrade to the precise word one item at a time, exactly as children in China do.

## Six Measure Words That Cover Most of Life

These six appear in almost every real day in China:

• **本 (běn)** for books and anything book-shaped — **一本书**, a book; **一本词典**, a dictionary.

• **杯 (bēi)** for glasses and cups — **一杯咖啡**, a coffee.

• **张 (zhāng)** for flat surfaces — **一张桌子**, a table; **一张票**, a ticket; **一张脸**, a face.

• **只 (zhī)** for animals and one of a pair — **一只猫**, a cat; **一只手**, one hand.

• **条 (tiáo)** for long, thin, flexible things — **一条河**, a river; **一条路**, a road; **一条鱼**, a fish.

• **件 (jiàn)** for clothing and matters — **一件衬衫**, a shirt; **一件事**, one matter.

Memorize each one together with a real phrase you actually use, and they stop being grammar and start being vocabulary.

## The Shape Logic Is Real

Look closer at the groups and the system reveals its personality. **张** collects tables, tickets, beds, and faces — flat, stretchable surfaces. **条** collects rivers, roads, dogs' tails, and even news items (一条消息) — things that are long and winding. Chinese is quietly teaching you to see objects the way the language sees them. Better still, textbooks and dictionaries almost always print a noun together with its measure word, so if you absorb them as a pair — like first name and last name — you never have to guess in the first place.

## What Happens When You Get It Wrong

Nothing dramatic — and that is the good news. Say **一个狗** instead of **一只狗** and people will laugh warmly and understand perfectly. Measure words matter most in writing, in HSK exams, and in formal speech, where the right classifier quietly signals real fluency. In spoken survival Chinese, communication beats perfection every single time. But if an exam sits on your horizon, nail the six above before touching the rare ones — exams test the common words, always.

## The Takeaway

Adopt 个 as your safety net today, then collect 本, 杯, 张, 只, 条, and 件 in real contexts — a coffee here, a train ticket there, one cat on the street. Read every new noun together with its measure word, the way you would read a first and last name. Within a month the classifier that once felt alien will feel exactly like what it is: a very small word carrying a very big picture.`,
  },
  {
    slug: 'shopping-bargaining-chinese',
    title: 'Shopping and Bargaining in Chinese: 多少钱 and the Art of the Deal',
    tag: 'culture',
    emoji: '🛍️',
    color: 'butter',
    excerpt:
      'The market dance has a script — 多少钱, 太贵了, 便宜一点儿 — and unwritten rules about where it applies. How to haggle politely in the era of QR codes.',
    content: `Walk into a Chinese shopping mall and the prices are fixed and printed. Walk into a street market ten minutes later and the price is a conversation. Bargaining in China is not combat and not cheating — it is a friendly social ritual with opening moves, counter-offers, and a walk-away dance that everyone knows by heart. Here is how to play it, and just as importantly, where not to.

## Where Bargaining Actually Happens

The rule of thumb: private stalls, tourist markets, and small independent shops negotiate; supermarkets, chain stores, restaurants, and pharmacies do not. Nobody haggles at the coffee chain or the bookstore — the fixed price is a service there. Markets, night stalls, and the great bazaars are where **多少钱** begins. When in doubt, ask the price and watch the seller's posture: in a market, the first number is an opening offer in a game, not a fact carved in stone.

## The Opening Moves Everyone Knows

The dance has a script, and it goes like this:

• **老板，这个多少钱？(lǎobǎn, zhège duōshao qián?)** — Boss, how much is this one? (老板, "boss," is the warm, default way to address a market seller.)

• **三百块。(sānbǎi kuài.)** — Three hundred kuài.

• **太贵了！(tài guì le!)** — Too expensive! (Say it with a smile; the drama is part of the fun.)

• **便宜一点儿吧。(piányi yìdiǎnr ba.)** — A little cheaper, please.

The seller counters, you counter again, and both of you know exactly what game you are playing. Your first offer can honestly be around half; you will usually land somewhere in the middle. And remember — the relationship and the laugh matter more to the outcome than the final ten kuài ever will.

## Numbers Are Your Entire Vocabulary

Bargaining is a numbers workout wearing a shopping costume. Prices come at you fast, and sellers use casual shortcuts constantly: **一百二 (yìbǎi èr)** for 120, **两块五 (liǎng kuài wǔ)** for 2.50, **二百三** for 230. If you have studied how Chinese numbers stack, this is the moment it pays for itself in real discounts. Then comes the classic closer: you make a final offer, the seller waves you off, you walk two genuine steps — and suddenly your price is acceptable. The walk-away is a move, not an insult; just be prepared to actually buy it at your price, because it works both ways.

## The Etiquette That Keeps It Friendly

Three unwritten rules keep the ritual pleasant for everyone. First, only bargain if you genuinely intend to buy — eating up a seller's morning for entertainment is truly rude. Second, keep the mood light: **太贵了** said with a grin is a dance step; said coldly, it becomes an accusation. Third, agree on the final price before you say yes to anything — once you are holding it, wearing it, or letting them bag it, you have effectively already bought it, and backing out then loses face for both of you.

## The Modern Twist: QR Codes Everywhere

One surprise waits at the register of even the smallest stall: the seller who negotiated fiercely will pull out a QR code for **微信 (Wēixìn, WeChat)** or **支付宝 (Zhīfùbǎo, Alipay)** — mobile payment runs everywhere, from night markets to temple fairs. Cash still works, and **现金 (xiànjīn)** remains worth knowing, but China's markets went digital faster than many banks in the West did. The striking part is what survived the upgrade completely: the haggling is ancient, the payment is futuristic, and nobody sees a contradiction between the two.

## The Takeaway

Treat bargaining as small theater you are allowed to enjoy: open with 多少钱, wince theatrically at 太贵了, counter with real numbers, and be genuinely ready to walk. Skip it entirely at supermarkets and chains, where fixed prices are the norm. And take the wins gracefully — the seller who accepted your price probably still made a profit, and both of you walk away having performed a small, honest, centuries-old piece of street culture.`,
  },
  {
    slug: 'chinese-names-explained',
    title: 'Chinese Names Explained: Surnames First, Wishes Inside (and How to Pick Yours)',
    tag: 'culture',
    emoji: '📛',
    color: 'peach',
    excerpt:
      'Why 王先生 is Mr. Wang and never Mr. Xiaoming, why five surnames cover hundreds of millions of people, and the three rules for choosing a Chinese name that truly fits you.',
    content: `A Chinese name is a tiny poem with rules: the surname arrives first, the given name carries wishes, and the whole thing usually fits in two or three syllables. For learners, understanding the system unlocks a surprising amount — how to address people correctly in emails and classes, why certain names feel warm and others formal, and how to choose a Chinese name that genuinely suits you instead of one from a random generator.

## The Surname Comes First — Always

Chinese names start with the family name: in **王小明 (Wáng Xiǎomíng)**, 王 (Wáng) is the surname and 小明 (Xiǎomíng) is the given name. This order flips the Western habit, and the polite titles follow the surname too: **王先生 (Wáng xiānsheng)** is Mr. Wang — never "Mr. Xiaoming." The same works with **老师 (lǎoshī)** after the surname for teachers. Getting this one rule right is the fastest way to sound respectful in messages, introductions, and class registers, and the fastest way to spot a translation error in a name printed the wrong way round.

## A Hundred Surnames for a Billion People

China's surname pool is astonishingly small. The classical **百家姓 (Bǎijiāxìng, Hundred Family Surnames)** is still roughly true today: 王 (Wáng), 李 (Lǐ), 张 (Zhāng), 刘 (Liú), and 陈 (Chén) alone cover hundreds of millions of people. Meet ten Chinese strangers and the odds are strong that two of them share a surname. This is exactly why colleagues and classmates distinguish each other by given names, nicknames, and job titles — a surname alone identifies a crowd, not a person, and everyone grows up knowing this.

## Given Names Are Made of Wishes

Parents assemble given names character by character, and every character means something concrete: **强 (qiáng)** wishes strength, **美 (měi)** wishes beauty, **雪 (xuě)** evokes snow, **明 (míng)** brightness. Siblings and cousins of the same generation often share one character — a built-in family tree inside the name itself. When you meet a **芳 (fāng, fragrance)**, you can fairly guess the family hoped for grace; a **伟 (wěi, great)** announces bigger ambitions. A name is the first poem most Chinese people ever receive, and many will happily explain their characters to you with real pride if you ask.

## How People Actually Address Each Other

Everyday address has layers of warmth built in. Teachers and bosses call full names without ceremony — it is normal, not scolding. Close circles use **小 (xiǎo, little)** plus the surname for the young: **小王 (Xiǎo Wáng)**. With warmth for seniors comes **老 (lǎo, old)** plus the surname: **老张 (Lǎo Zhāng)** signals decades of friendship. And a given name alone — especially the doubled syllable of a child's name like **明明 (Míngming)** — is reserved for family and the closest friends. It is a small intimacy ladder built directly into pronunciation, and you can hear exactly where you stand on it.

## Choosing Your Own Chinese Name

Many learners eventually adopt a Chinese name, and the good versions follow three rules. First, keep a sound bridge to your real name — Samuel becomes **山姆 (Shānmǔ)**, Maria becomes **玛丽亚 (Mǎlìyà)**, and the connection makes it easy for everyone, including you. Second, choose characters with meanings you would happily wear forever, and have a native speaker screen out the unlucky homophones and the cartoon-character jokes before anything becomes permanent. Third, keep it simple: two or three characters, easy tones, nothing that reads like a fantasy novel. Your name should be pleasant to hear at a front desk, not a riddle at a party.

## The Takeaway

Remember one order (surname first), one fact (a small pool of surnames and meaningful, wish-carrying given names), and one ladder (full name, 小, 老, then the doubled given name of true intimacy). When you pick your own name, borrow a native speaker's ear for an afternoon — the right characters will fit like well-made clothes. Done well, your Chinese name becomes the first Chinese sentence you own completely, and the one you will introduce yourself with for years.`,
  },
]

// 🔍 اعتبارسنجی قالب (هم‌الگوی فاز ۶۹ — هشدار در کنسول)
function validate(p: SeedPost): string[] {
  const warnings: string[] = []
  const content = p.content.trim()
  const blocks = content.split(/\n{2,}/).filter(Boolean)
  const headings = blocks.filter((b) => b.startsWith('## '))

  if (headings.length < 4 || headings.length > 7)
    warnings.push(`headings = ${headings.length} (expected 4–7)`)
  if (!headings.some((h) => h.toLowerCase().includes('takeaway')))
    warnings.push('no takeaway section heading found')
  if (content.length < 3000) warnings.push(`content length = ${content.length} (< 3000 chars)`)
  for (const b of blocks) {
    // ممنوعه: لیست با - یا *، تیتر تک-#، نقل‌قول، لیست عددی (تیتر فقط با ## مجاز است)
    if (/^[-*]|^#(?!#)|^>|^\d+\./.test(b)) warnings.push(`forbidden markdown block starts: ${b.slice(0, 40)!}`)
  }
  if (/\[[^\]]*\]\(/.test(content) || /<\/?[a-z]+>/i.test(content))
    warnings.push('link or HTML detected')
  const cjk = (content.match(/[\u4e00-\u9fff]/g) || []).length
  const latinWords = content.replace(/[\u4e00-\u9fff]/g, ' ').split(/\s+/).filter(Boolean).length
  const wordCount = latinWords + cjk
  if (wordCount < 700 || wordCount > 1100)
    warnings.push(`word count = ${wordCount} (expected 700–1100)`)
  return warnings
}

async function main() {
  let upserted = 0
  for (const p of SEED) {
    const content = p.content.trim()
    const warnings = validate({ ...p, content })
    if (warnings.length) console.warn(`⚠ ${p.slug}: ${warnings.join(' | ')}`)

    const before = await db.post.findUnique({ where: { slug: p.slug } })
    await db.post.upsert({
      where: { slug: p.slug },
      // ردیف موجود → فقط این فیلدها به‌روز می‌شوند (views و createdAt دست‌نخورده)
      update: {
        title: p.title,
        tag: p.tag,
        emoji: p.emoji,
        color: p.color,
        excerpt: p.excerpt,
        content,
        published: true,
      },
      create: {
        slug: p.slug,
        title: p.title,
        tag: p.tag,
        emoji: p.emoji,
        color: p.color,
        excerpt: p.excerpt,
        content,
        published: true,
      },
    })
    upserted++
    console.log(`✔ upserted: ${p.emoji} ${p.slug} (${p.tag}/${p.color}) — ${before ? 'updated' : 'created'}`)
  }
  console.log(`\nDone — ${upserted} posts upserted, total ${await db.post.count()} posts`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => db.$disconnect())
