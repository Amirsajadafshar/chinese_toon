// ---------------------------------------------------------------------------
// 📝 Seed ایدمپوتنت ۱۰ مقالهٔ وبلاگ آموزشی واقعی → جدول Post (Task 2-a)
//
// قالب محتوا دقیقاً مطابق رندرکنندهٔ سایت (blog-parts.tsx):
//   • بلوک‌ها با «یک خط خالی» جدا می‌شوند
//   • بلوکی که با «## » شروع شود تیتر می‌شود (برای فهرست «در این صفحه»)
//   • فقط **بولد** به‌صورت inline پشتیبانی می‌شود
//   • آیتم‌های لیستی هرکدام یک بلوک جدا با پیشوند «• »
//
// ایدمپوتنسی: upsert بر اساس slug یکتا — ردیف‌های موجود فقط title/tag/emoji/
// color/excerpt/content/published آن‌ها به‌روز می‌شود؛ هیچ ردیفی حذف نمی‌شود و
// به ۴ مقالهٔ قبلی سایت و شمارندهٔ views هیچ دست‌زدنی نمی‌شود.
//
// اجرا (env صریح، چون .env به دیتابیس قدیمی اشاره می‌کند):
//   cd /home/z/my-project && DATABASE_URL=file:/home/z/data/chinesetoon.db bun scripts/seed-blog-task69.ts
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
    slug: 'how-long-to-learn-chinese',
    title: 'How Long Does It Really Take to Learn Chinese? An Honest Timeline',
    tag: 'tips',
    emoji: '⏳',
    color: 'sage',
    excerpt:
      'No hype and no shortcuts — a realistic look at how long Mandarin takes, what actually shapes your progress, and what to expect after 3, 6, and 12 months.',
    content: `Ask ten people how long it takes to learn Chinese and you will get ten very different answers: "years," "forever," "two weeks if you use this app." The truth sits somewhere in the middle, and it depends far less on talent than most people think. Here is an honest, realistic timeline — no hype, no discouragement — based on how real learners actually progress.

## The Honest Answer, Without the Hype

For English speakers, Mandarin is genuinely one of the longer journeys among popular languages. The U.S. Foreign Service Institute classifies it as a "super-hard" language, estimating around 2,200 hours of study for professional working proficiency — roughly three times what Spanish or French requires. But that number describes diplomats who need to read newspapers and give formal presentations. If your goal is **real, useful conversation** — ordering food, making friends, traveling, watching shows with subtitles — you are looking at a much friendlier target: roughly **one to two years of steady study** to handle everyday life comfortably, and a satisfying, functional level much sooner than that.

## What Actually Shapes Your Timeline

Two learners can start the same day and end up in completely different places a year later. These are the factors that matter most:

• **Weekly study time** — the single biggest factor. Thirty minutes a day (about 3.5 hours a week) builds real momentum; two sessions a month does not, no matter how smart you are.

• **Consistency** — daily or near-daily contact with the language beats weekend marathons. Your brain consolidates memory between sessions, so frequent short exposures win.

• **Your native language** — English speakers need to learn tones, characters, and new sounds from scratch. Speakers of Japanese or Korean start with a head start in vocabulary and, for Japanese, characters too.

• **Environment and input** — living in China, having Chinese-speaking friends, or consuming lots of Chinese media can cut a timeline dramatically. Immersion is powerful even when it is passive.

• **Clarity of goals** — "learn Chinese" is too vague to finish. "Order dinner and chat with my friend's parents" gives your brain a clear, reachable target.

## What to Expect at 3, 6, and 12 Months

Realistic snapshots, assuming about 30–45 minutes a day:

• **After 3 months** you can handle greetings, numbers, simple questions, and a short self-introduction. You know pinyin, you recognize your first 100–200 words, and tones still trip you up constantly — completely normal.

• **After 6 months** the fog starts to lift. You can navigate restaurants, taxis, and shops, understand slow, clear speech on familiar topics, and hold a basic five-minute conversation. Around **HSK 2** level, roughly 300 words.

• **After 12 months** you have a genuine foundation: everyday conversations, simple opinions, and the ability to keep learning mostly on your own. Around **HSK 3**, roughly 600 words — the point where many learners say Chinese "clicked."

## HSK Milestones as a Map

The classic HSK ladder makes a surprisingly good progress bar. **HSK 1** (about 150 words) is achievable within your first couple of months, **HSK 2–3** marks survival-to-conversation territory within the first year, and **HSK 4** (about 1,200 words) usually takes a year and a half to two years and unlocks comfortable daily life. **HSK 5–6** belong to advanced study. Treat these levels as signposts, not finish lines — the goal is communication, and the exam only measures a slice of it.

## Why Consistency Beats Intensity

A common pattern: someone studies five hours on Sunday, feels exhausted, disappears for two weeks, and concludes they have "no talent for languages." Meanwhile the learner who does **15–30 focused minutes a day** quietly overtakes them. Spaced, frequent review is how memory actually works — it is the difference between learning and endlessly re-learning. There is a Chinese saying that captures it perfectly: **熟能生巧 (shú néng shēng qiǎo)** — skill grows from practice. Little and often, every day, forever. That is the entire secret.

## The Takeaway

Plan for roughly a year of steady, moderate study to reach everyday conversation, and use HSK levels as friendly signposts along the way. Pick a daily amount of time you can honestly sustain on your worst week — not your best one — and protect it. Six consistent months will surprise you; three inconsistent years will not.`,
  },
  {
    slug: '20-essential-chinese-phrases',
    title: '20 Essential Chinese Phrases for Real Life (With Pinyin and Examples)',
    tag: 'tips',
    emoji: '💬',
    color: 'butter',
    excerpt:
      "From 你好 to 结账 — twenty phrases you'll genuinely use in China, each with pinyin, English, and a mini example that shows how it sounds in real life.",
    content: `Some phrases earn their place in your memory the first time you use them. These twenty do exactly that — they cover greetings, transport, food, and the moments when you need help. Learn five a week and within a month you will not just survive in Chinese, you will sound friendly doing it.

## Greetings and Politeness

• **你好 (nǐ hǎo)** — Hello. Works at any time of day, with anyone, and you will hear it constantly. Example: 你好，我叫李明！(Nǐ hǎo, wǒ jiào Lǐ Míng!) — Hello, my name is Li Ming!

• **谢谢 (xièxie)** — Thank you. The quickest way to sound polite. Example: 谢谢你的帮助！(Xièxie nǐ de bāngzhù!) — Thanks for your help!

• **不客气 (bú kèqi)** — You're welcome. Literally "don't be polite." Example: 谢谢！— 不客气！(Xièxie! — Bú kèqi!)

• **不好意思 (bù hǎoyìsi)** — Excuse me / sorry (the light, everyday version). Perfect for squeezing past people or politely claiming attention. Example: 不好意思，让一下。(Bù hǎoyìsi, ràng yíxià.) — Excuse me, coming through.

• **再见 (zàijiàn)** — Goodbye. Literally "see you again." Example: 明天见！再见！(Míngtiān jiàn! Zàijiàn!) — See you tomorrow! Bye!

## Getting Around

• **请问，地铁站怎么走？(qǐngwèn, dìtiě zhàn zěnme zǒu?)** — Excuse me, how do I get to the subway station? Swap in any place you need. Example: 往前走，然后左转。(Wǎng qián zǒu, ránhòu zuǒ zhuǎn.) — Go straight ahead, then turn left.

• **我要去这个地址。(wǒ yào qù zhège dìzhǐ.)** — I'd like to go to this address. Show the driver your phone — this sentence does the rest. Example: 师傅，我要去这个地址。(Shīfu, wǒ yào qù zhège dìzhǐ.) — Driver, here is where I'm going.

• **还有多久？(hái yǒu duōjiǔ?)** — How much longer? Useful in taxis, queues, and bus rides. Example: 还要十分钟。(Hái yào shí fēnzhōng.) — About ten more minutes.

• **离这儿远吗？(lí zhèr yuǎn ma?)** — Is it far from here? Example: 不远，走五分钟。(Bù yuǎn, zǒu wǔ fēnzhōng.) — Not far, five minutes on foot.

• **我可以坐这里吗？(wǒ kěyǐ zuò zhèlǐ ma?)** — May I sit here? Example: 当然可以。(Dāngrán kěyǐ.) — Of course.

## Food and Ordering

• **我要这个。(wǒ yào zhège.)** — I'd like this one. Point at the menu, the dish in the window, or the neighbor's table. Example: 我要这个和那个。(Wǒ yào zhège hé nàge.) — I'll take this and that.

• **不要太辣。(bú yào tài là.)** — Not too spicy, please. Your future self says thank you. Example: 我不太能吃辣。(Wǒ bú tài néng chī là.) — I can't really handle spicy food.

• **多少钱？(duōshao qián?)** — How much is it? Example: 一共二十块。(Yígòng èrshí kuài.) — Twenty yuan in total.

• **结账！(jiézhàng!)** — The check, please! You will also hear 买单 (mǎidān). Example: 服务员，结账！(Fúwùyuán, jiézhàng!) — Waiter, check please!

• **太好吃了！(tài hǎochī le!)** — So delicious! Cooks and grandmothers love hearing this. Example: 这个饺子太好吃了！(Zhège jiǎozi tài hǎochī le!) — These dumplings are amazing!

## Small Talk and Emergencies

• **你叫什么名字？(nǐ jiào shénme míngzi?)** — What's your name? Example: 我叫王芳。(Wǒ jiào Wáng Fāng.) — My name is Wang Fang.

• **我会说一点儿中文。(wǒ huì shuō yìdiǎnr Zhōngwén.)** — I speak a little Chinese. An instant goodwill generator. Example: 请说慢一点儿。(Qǐng shuō màn yìdiǎnr.) — Please speak a little slower.

• **我听不懂。(wǒ tīng bu dǒng.)** — I don't understand. Pair it with a smile, not panic. Example: 你能写下来吗？(Nǐ néng xiě xiàlái ma?) — Can you write it down?

• **你会说英语吗？(nǐ huì shuō Yīngyǔ ma?)** — Do you speak English? Example: 会一点点。(Huì yìdiǎndiǎn.) — Just a little.

• **帮帮我！(bāngbang wǒ!)** — Help me! For real emergencies. Memorize the numbers too: **110** police, **120** ambulance, **119** fire. Example: 我丢了护照。(Wǒ diū le hùzhào.) — I lost my passport.

## The Takeaway

Pick five phrases and say each one out loud at least ten times today — muscle memory is built with the mouth, not the eyes. Focus first on the greetings and the food section; they will pay off fastest in real life. And remember that 我听不懂 said with a friendly tone opens more doors than perfect grammar ever will.`,
  },
  {
    slug: 'chinese-tones-beginners-guide',
    title: 'Mandarin Tones for Beginners: A Friendly, No-Panic Guide',
    tag: 'tips',
    emoji: '🎵',
    color: 'peach',
    excerpt:
      'Four tones plus a quiet fifth — explained calmly with practical tips, tone-pair drills, and permission to make mistakes. Tones are a skill, not a talent.',
    content: `Tones have a scary reputation, but they are just pitch patterns — and you already use pitch in English every time your voice rises to ask a question. Mandarin simply uses pitch for meaning. Here is the whole system, explained calmly, plus the practice methods that actually work.

## Why Tones Matter (and Why They Don't Need to Scare You)

In Mandarin, the syllable "ma" can mean mother, hemp, horse, or scold depending on the pitch you say it with. That sounds alarming until you notice two things. First, context does enormous rescue work: a sentence like 你好吗？(Nǐ hǎo ma? — How are you?) is never going to be misunderstood. Second, tones are a **physical skill**, like rolling an "r" or dribbling a football — trainable, not a talent you are born with. Thousands of learners with "no musical ear" speak clearly understood Mandarin every day.

## The Four Tones, One by One

• **First tone: mā** — high and level, like holding a note. Imagine singing a steady "aaaah" at the doctor. 妈 (mā) means mother.

• **Second tone: má** — rising, like an incredulous English "Eh? What?" 麻 (má) means numb.

• **Third tone: mǎ** — dipping, falling then rising, like a skeptical "weeell." 马 (mǎ) means horse.

• **Fourth tone: mà** — sharp and falling, like a firm "No!" 骂 (mà) means to scold.

The classic set — **mā má mǎ mà** — is your whole problem and your whole solution in four syllables. Practice it until the four pitches feel like four different notes of a song.

Many teachers pair tones with hand gestures — a flat hand for the first tone, a rising sweep for the second, a check-mark dip for the third, a firm chop for the fourth. It looks theatrical, and that is exactly why it works: movement anchors pitch in memory. Use the gestures while drilling mā má mǎ mà and while learning any new word; within a couple of weeks your hand often knows the tone before your mouth does.

## The Neutral Tone: The Quiet Fifth

Many two-syllable words drop their second syllable into a short, light, toneless beat called the neutral tone (轻声, qīngshēng). In 妈妈 (māma, mom), 朋友 (péngyou, friend), and 你呢 (nǐ ne, and you?), the second syllable is quick and relaxed. Getting this right is a huge part of sounding natural — overstressing every syllable is one of the clearest beginner accents there is.

## Practical Tips That Actually Work

• **Exaggerate at first.** Make your tones cartoonishly big. Shrinking them too early is how flat, unclear tones form.

• **Learn words with their tone attached.** Memorize "hǎo, third tone," not just "hao." The tone is part of the word, like its spelling.

• **Record yourself.** Compare against a native clip. Your own voice reveals what your ears otherwise miss.

• **Listen far more than you speak.** Your mouth copies what your ears have absorbed. Ten minutes of daily listening quietly does the heavy lifting.

## Practice With Tone Pairs

Real words are rarely one syllable, so combinations matter more than isolated pitches. Drill common pairs from real vocabulary: 你好 (nǐ hǎo, 3-3), 老师 (lǎoshī, 3-1), 朋友 (péngyou, 2-0), 学习 (xuéxí, 2-2), 汉字 (Hànzì, 4-4), 再见 (zàijiàn, 4-4). One bonus rule worth knowing early: when two third tones meet, the first usually becomes a second tone — that is why 你好 is actually said "ní hǎo." You will absorb this naturally, but knowing it exists prevents a lot of confusion.

## Mistakes Are Normal. Really.

Every learner — including future fluent you — misfires tones daily, and native speakers still understand almost everything from context. When a mix-up does happen, it usually produces a smile and a repeat, not a disaster. Language partners are famously patient about this; correcting tones together is practically a bonding activity. Aim for clarity, forgive yourself quickly, and keep talking.

Two classic mix-ups show why a few minutes of targeted practice pays off. 买 (mǎi, to buy) and 卖 (mài, to sell) differ only in tone — which matters when you are shopping and guessing wrong is expensive. And 四 (sì, four) versus 十 (shí, ten) trips up almost every beginner in listening tests. Drilling just these high-stakes pairs gives you the best return on your practice time.

## The Takeaway

Learn each new word as a pitch pattern, drill tone pairs from real vocabulary for a few minutes daily, and listen to native audio every single day. Within weeks your ear starts hearing the four tones automatically — and the moment that happens, the whole language gets noticeably easier.`,
  },
  {
    slug: 'hsk-explained-levels',
    title: 'HSK Explained: What Each Level Really Means (and How to Use It)',
    tag: 'hsk',
    emoji: '📚',
    color: 'sage',
    excerpt:
      'HSK 1–6, the newer nine-level HSK 3.0 standard, and how to use the exam ladder as a practical roadmap for your Mandarin — explained honestly.',
    content: `If you have spent even a week around Chinese learners, you have heard the letters HSK. It sounds official and slightly mysterious. Here is what it actually is, what each level means in real life, how the newer standard changes the picture, and how to use the whole thing as a personal roadmap.

## What Is the HSK, Exactly?

HSK stands for 汉语水平考试 (Hànyǔ Shuǐpíng Kǎoshì) — the Chinese Proficiency Test. It is the official standardized exam for non-native speakers, run by China's Center for Language Education and Cooperation. At the lower levels it tests listening and reading (plus writing where relevant), and the sections grow as the levels rise. It is offered on paper or computer at test centers around the world, several times a year.

A few practical mechanics are worth knowing. Each section is scored out of 100 points, and you generally need 60 in each section to pass. Results arrive online a few weeks after the test, and the certificate does not expire — though universities naturally prefer recent evidence of your level. There is also a separate speaking exam, HSKK (汉语水平口语考试, Hànyǔ Shuǐpíng Kǒuyǔ Kǎoshì), offered at beginner, intermediate, and advanced tiers, which pairs nicely with the written test.

## The Classic Six Levels (HSK 2.0)

This is the version most learners, universities, and test centers still know best:

• **HSK 1 — about 150 words.** Very basic phrases: greetings, numbers, simple questions. Realistic after your first two or three months of study.

• **HSK 2 — about 300 words.** Simple everyday communication about routines, shopping, and family. Roughly the six-month mark for steady learners.

• **HSK 3 — about 600 words.** You can handle daily life in Chinese: directions, plans, opinions in simple form. This is where conversations start feeling real.

• **HSK 4 — about 1,200 words.** Discuss a wide range of everyday topics and read longer texts. Many universities in China ask for HSK 4 or 5 for admission.

• **HSK 5 — about 2,500 words.** Films, news, and fluent conversation on most subjects. Often called the level for working in Chinese.

• **HSK 6 — about 5,000 words.** Comfortably express yourself in complex, academic, or professional contexts.

## HSK 3.0: The Newer Nine-Level Standard

In 2021 China introduced a new national standard for Chinese proficiency (often called HSK 3.0) that reorganizes the ladder into **nine levels** grouped in three bands, with noticeably larger vocabulary targets — the new beginner band alone assumes several hundred words rather than 150, and the top of the ladder reaches roughly 11,000. It also weaves in handwriting, translation, and other skills. In short: the ladder got taller and the steps got bigger.

## So Which System Should You Care About?

Here is the practical, honest answer: **most test centers around the world still offer the familiar HSK 1–6 exams**, and universities and employers overwhelmingly still quote those numbers. If you book an exam this year, you are almost certainly booking the classic levels 1–6. Nothing you learn for them is wasted under the new standard — the newer curriculum simply extends upward from very similar core vocabulary. Check your local test center's website for what it currently offers, because rollout of the new format varies by country.

## Using HSK as a Roadmap (Not a Finish Line)

Treat the levels as checkpoints with real vocabulary attached — that is what they are best at. A rough, honest pace for a busy adult: HSK 1–2 within the first six months, HSK 3 around the one-year mark, HSK 4 by year two. Two cautions. First, passing a paper exam is not the same as holding a conversation, so pair test prep with real speaking practice. Second, do not chase vocabulary lists at the expense of actually using the words you already know — ten words you can use beat fifty words you can only recognize.

If you are unsure where you stand, download an official past paper for HSK 3 and HSK 4 and try each under timed conditions. The gap between your raw score and the pass line tells you far more honestly than any quiz app how many months of vocabulary and listening you actually need.

## The Takeaway

Pick your next HSK level, grab its vocabulary list, and let it organize your next three to six months of study — then book the exam to give yourself a real deadline. But measure success by what you can actually say and understand out loud, not just by a certificate. The exam is the map; you are still the one driving.`,
  },
  {
    slug: 'introduce-yourself-in-chinese',
    title: 'How to Introduce Yourself in Chinese: Name, Country, Job, and More',
    tag: 'tips',
    emoji: '👋',
    color: 'butter',
    excerpt:
      '我叫…，我是…人，我住在… — the complete beginner toolkit for telling people who you are, with pinyin, English, and mini-dialogues you can copy tonight.',
    content: `Your first real Chinese conversation will almost certainly be an introduction — and the good news is that introductions in Mandarin are formulaic. Learn these short patterns and you can walk into any classroom, party, or meeting and say exactly who you are. Copy the mini-dialogues as you read.

## Saying Your Name: 我叫 and 我姓

• **我叫… (wǒ jiào…)** — My name is… The all-purpose pattern. Example: 我叫安娜。(Wǒ jiào Ānnà.) — My name is Anna.

• **我姓… (wǒ xìng…)** — My surname is… Slightly more formal; used with the family name only. Example: 我姓史密斯。(Wǒ xìng Shǐmìsī.) — My last name is Smith.

Mini-dialogue: 你叫什么名字？(Nǐ jiào shénme míngzi?) — What's your name? / 我叫大卫。(Wǒ jiào Dàwèi.) — I'm David. One detail worth knowing: in Chinese the family name comes first, so 王芳 (Wáng Fāng) is Ms. Wang.

## Saying Where You're From: 我是…人

• **我是…人 (wǒ shì… rén)** — I am … (nationality). Just add your country: 我是英国人 (Wǒ shì Yīngguórén.) — I'm British. 我是美国人 (Wǒ shì Měiguórén.) — I'm American. 我是法国人 (Wǒ shì Fǎguórén.) — I'm French.

Mini-dialogue: 你是哪国人？(Nǐ shì nǎ guó rén?) — What's your nationality? / 我是澳大利亚人。(Wǒ shì Àodàlìyàrén.) — I'm Australian.

## What You Do: 我是学生, 我是老师, and Beyond

• **我是学生 (wǒ shì xuésheng)** — I'm a student. Example: 我是大学生。(Wǒ shì dàxuéshēng.) — I'm a university student.

• **我是老师 (wǒ shì lǎoshī)** — I'm a teacher. The pattern 我是 plus a job extends everywhere: 我是医生 (wǒ shì yīshēng) — I'm a doctor.

• **我在…工作 (wǒ zài… gōngzuò)** — I work at/in… Example: 我在医院工作。(Wǒ zài yīyuàn gōngzuò.) — I work in a hospital.

Mini-dialogue: 你做什么工作？(Nǐ zuò shénme gōngzuò?) — What do you do? / 我是学生，在学中文。(Wǒ shì xuésheng, zài xué Zhōngwén.) — I'm a student, studying Chinese.

## Where You Live: 我住在…

• **我住在… (wǒ zhù zài…)** — I live in… Example: 我住在上海。(Wǒ zhù zài Shànghǎi.) — I live in Shanghai.

• **我喜欢… (wǒ xǐhuan…)** — I like… The easiest way to add personality to an introduction. Example: 我喜欢学中文。(Wǒ xǐhuan xué Zhōngwén.) — I like learning Chinese.

Mini-dialogue: 你住在哪里？(Nǐ zhù zài nǎlǐ?) — Where do you live? / 我住在北京，离这儿不远。(Wǒ zhù zài Běijīng, lí zhèr bù yuǎn.) — I live in Beijing, not far from here.

## Putting It All Together

Here is a complete 30-second introduction you can adapt tonight: 大家好！我叫安娜，我是英国人。我是学生，我住在上海。我很喜欢学中文。很高兴认识大家！(Dàjiā hǎo! Wǒ jiào Ānnà, wǒ shì Yīngguórén. Wǒ shì xuésheng, wǒ zhù zài Shànghǎi. Wǒ hěn xǐhuan xué Zhōngwén. Hěn gāoxìng rènshi dàjiā!) — Hello everyone! My name is Anna, I'm British. I'm a student and I live in Shanghai. I really enjoy learning Chinese. Nice to meet you all!

The closing line 高兴认识你 (gāoxìng rènshi nǐ) — nice to meet you — is the perfect handshake at the end of any introduction, and 很高兴认识大家 works for a group.

## The Takeaway

Write your own four-sentence introduction tonight — name, nationality, what you do, where you live — and say it out loud ten times before bed. It is the highest-value 100 words of Chinese you will ever memorize, and every time you use it you practice tones, vocabulary, and confidence at the same time.`,
  },
  {
    slug: '10-common-chinese-words',
    title: "The 10 Most Useful Chinese Words You'll Use Every Single Day",
    tag: 'tips',
    emoji: '🔑',
    color: 'peach',
    excerpt:
      '好, 的, 不, 吗 and friends — ten tiny words that appear in almost every Mandarin sentence, explained by how they actually work, not by dictionary gloss.',
    content: `Frequency lists tell an interesting story: a handful of tiny words do most of the work in Mandarin. Master the ten below and you hold the skeleton of almost every sentence you will ever need. Each one comes with how it is actually used — not just a dictionary gloss.

## The Absolute Basics: 我, 你, 好

• **我 (wǒ)** — I, me. The most spoken word in any conversation about yourself. Add 们 for 我们 (wǒmen) — we. Example: 我是中文迷。(Wǒ shì Zhōngwén mí.) — I'm a Chinese-language enthusiast.

• **你 (nǐ)** — you. Pairs with everything: 你好吗？(Nǐ hǎo ma?) — How are you? The plural is 你们 (nǐmen).

• **好 (hǎo)** — good, fine, okay. It multiplies everywhere: 好吃 (hǎochī) — tasty, 好人 (hǎorén) — a good person, and 好的！(Hǎo de!) — Okay! as friendly agreement.

## The Grammar Glue: 的, 很, 不

• **的 (de)** — the linking particle. It attaches ownership and descriptions: 我的书 (wǒ de shū) — my book, 你的车 (nǐ de chē) — your car. You will write 的 thousands of times; it is genuinely everywhere.

• **很 (hěn)** — very — and more. In simple descriptions Chinese usually needs it as a soft link: 我很好 (Wǒ hěn hǎo) — I'm fine, 他很忙 (Tā hěn máng) — He's busy. In these sentences it often just means "is," not "very."

• **不 (bù)** — not. The universal negation: 不忙 (bù máng) — not busy, 不去 (bú qù) — not going. Listen carefully: before a fourth tone it flips to "bú" — 不是 (bú shì) — is not.

## Questions and Places: 吗, 在

• **吗 (ma)** — the question particle. Attach it to a statement and it becomes a yes/no question. 你是学生吗？(Nǐ shì xuésheng ma?) — Are you a student? 好吗？(Hǎo ma?) — Okay?

• **在 (zài)** — at, in — and also "is doing." 我在家 (Wǒ zài jiā) — I'm at home. 他在学习 (Tā zài xuéxí) — He's studying. One word, two jobs, both essential.

## Wants, Ability, and Time: 想, 会, 时候

• **想 (xiǎng)** — to want to; also to miss. 我想吃饺子 (Wǒ xiǎng chī jiǎozi.) — I want to eat dumplings. 我想你！(Wǒ xiǎng nǐ!) — I miss you! It also softens requests: 我想问问 (wǒ xiǎng wènwen) — I'd like to ask something.

• **会 (huì)** — know how to; will. 我会说中文 (Wǒ huì shuō Zhōngwén.) — I can speak Chinese. 明天会下雨 (Míngtiān huì xiàyǔ.) — It will rain tomorrow. Skill and future in one word.

• **时候 (shíhou)** — time, moment. 什么时候 (shénme shíhou)? — when? 小时候 (xiǎoshíhou) — childhood. Example: 我们什么时候走？(Wǒmen shénme shíhou zǒu?) — When do we leave?

## Why These Tiny Words Deserve Your Attention

Notice what happened above: with 我, 你, 好, 很, 不, 吗, 在, 想, 会, and 时候 you can already build real sentences — 你好吗？我想吃。他不会去。什么时候？Fluency is not thousands of exotic words; it is hundreds of small ones used fluently. Textbooks introduce the vocabulary, but these ten are the skeleton the vocabulary hangs on. When you learn any new word, practice it inside one of these patterns and it will stick for good.

The numbers back this up: linguists have calculated that 的 alone accounts for roughly four percent of everything written in Chinese — more than almost any other single word in the language. And 吗 has a soft-spoken cousin, 呢 (ne), which turns statements into gentle questions without changing word order: 你呢？(Nǐ ne?) — And you?

## The Takeaway

Spend this week making one example sentence per word — out loud, with your own life in them: real 我 sentences about real coffee and real deadlines. Then challenge yourself to a tiny dialogue using all ten. These words make up roughly a tenth of everything a native speaker says, which makes them the single best time investment in the language.`,
  },
  {
    slug: 'mandarin-vs-english',
    title: "Mandarin vs. English: What's Actually Different (and What's Easier Than You Think)",
    tag: 'culture',
    emoji: '🌏',
    color: 'sage',
    excerpt:
      'Tones, characters, and new sounds — plus the reassuring truth about Chinese grammar: no conjugations, no tenses, no plurals. A beginner-friendly comparison.',
    content: `Mandarin has a fierce reputation, but much of what frightens beginners is misunderstood. Put the two languages side by side and the picture is surprisingly encouraging: one headline difference (tones), one big investment (characters), and — plot twist — a grammar section that English speakers find refreshing.

## Tones: The Headline Difference

English uses pitch for emotion — a rising voice makes a question, a falling one ends a statement. Mandarin uses pitch for **meaning**: mā (妈, mother), má (麻, numb), mǎ (马, horse), and mà (骂, to scold) are four different words. This is the single biggest adjustment for English speakers. The encouraging part: you already control pitch precisely every time you sound surprised or sarcastic. You are not learning a new skill — you are re-pointing one you already own. And one more reassurance: tone mistakes almost never block understanding in context, so your early conversations will work even while your tones are still under construction.

## Characters vs. the Alphabet

English has 26 letters; Mandarin has characters — thousands of them, one per syllable. Full literacy needs roughly 2,500–3,500 characters, which is why learners rely on **pinyin**, the official romanization system, as a bridge: 你好 = nǐ hǎo. The secret about characters is that they build from a few hundred reusable **radicals** — the water radical 氵 flows through 河 (hé, river) and 海 (hǎi, sea). Characters start as museum-piece intimidation and end up feeling like Lego.

## Word Order: More Familiar Than You Think

Core word order is identical: subject–verb–object. 我爱你 (Wǒ ài nǐ) — I love you. Word for word. 你学中文 (Nǐ xué Zhōngwén) — you study Chinese. The one habit to build: time and place go **before the verb**, where English often puts them after. 我明天去北京 (Wǒ míngtiān qù Běijīng) — literally "I tomorrow go Beijing." Change that one habit and most sentences assemble themselves.

## What Chinese Makes Easier

Here is the list English never advertises:

• **No verb conjugations.** The verb 吃 (chī, to eat) never changes: 我吃，你吃，他昨天吃，我们明天吃. While you conjugate "to be," your Chinese-speaking friend simply does not.

• **No plurals.** 三个朋友 (sān gè péngyou) — three friend. The number does the work; the noun stays frozen.

• **No grammatical gender.** Every noun is simply itself.

• **No articles.** Chinese gets along perfectly well without "the" and "a."

• **Effortless questions.** Attach 吗 (ma) to a statement: 你好吗？Done.

Even the parts that sound exotic turn out to be friendly. Chinese does use measure words — little counters between numbers and nouns, like 个 (gè) in 三个人 (sān gè rén) — but beginners can lean on 个 for a huge share of everyday nouns and refine their choices later. Compare that with memorizing gendered articles for every noun in French or German, and measure words start looking like a convenience rather than a chore.

Beginners consistently report the same experience: Chinese grammar is friendlier than its reputation, and the real workload lives in pronunciation and characters.

## Sounds That Don't Exist in English

A few pinyin letters are impostors. **x** is a soft, hissy "sh" (行 xíng — okay), **q** is a "ch" said with spread lips (七 qī — seven), **zh** is a solid "j" (中国 Zhōngguó), **c** is "ts" like the end of "cats" (菜 cài — vegetable), and **ü** is "ee" said with rounded lips (绿 lǜ — green). None of these require an anatomy lesson — a few minutes with a native audio clip and some shadowing trains them faster than any written description. Twenty minutes of careful imitation in your first week is worth more than hours of reading about phonetics. Learn pinyin sounds properly in week one; it prevents months of fossilized mistakes later.

## The Takeaway

Budget your energy where Mandarin actually differs — tones, characters, and a handful of new sounds — and enjoy the grammar, which asks for less than English does. Learn pinyin correctly from day one, and treat pre-verb word order as your one rule to relearn. Different? Yes. Harder all the way through? Not even close.`,
  },
  {
    slug: 'learn-chinese-15-minutes-a-day',
    title: 'Learn Chinese in 15 Minutes a Day: A Realistic Routine That Sticks',
    tag: 'tips',
    emoji: '⏱️',
    color: 'butter',
    excerpt:
      'Four minutes of flashcards, four of listening, four of speaking, three of review — a daily 15-minute Mandarin routine designed for busy, real humans.',
    content: `You do not need two free hours to learn Mandarin. You need fifteen honest minutes, most days, with a plan. Fifteen minutes a day adds up to more than 90 hours a year — enough to move steadily through real milestones. Here is a routine that fits into actual life, including the messy days.

## Why 15 Minutes Actually Works

Short daily sessions beat long weekly ones for three reasons. Memory consolidates between exposures, so daily contact multiplies retention. Spaced repetition — the engine behind every flashcard app — only functions if you show up often. And a small session has almost no friction, which means it survives bad days, exams, and toddler bedtimes. It is the same principle that makes brushing your teeth effortless: the habit is small enough that skipping it feels stranger than doing it. The goal is not a heroic study day; it is a **never-zero** habit.

## Your 15-Minute Routine, Minute by Minute

• **Minutes 1–4: Vocabulary review.** Open your flashcard deck (Anki or Pleco both work) and clear due cards: 10–15 words with characters, pinyin, and meaning. Recall first, flip second — the struggle is the learning.

• **Minutes 5–8: Listening.** One short clip from a learner podcast or a subtitled video. First listen for the gist, second listen for details. The same clip twice beats two clips once.

• **Minutes 9–12: Speaking and shadowing.** Replay the same audio and speak along, mimicking rhythm and tones like a dubbing artist. Your mouth needs repetitions, not perfection.

• **Minutes 13–15: Pronunciation or writing.** Drill tones on words from today's clip, or write one sentence about your day: 今天我很忙。(Jīntiān wǒ hěn máng.) — Today I'm busy. Small, personal sentences stick best.

A few setup details make this dramatically easier. Preload tomorrow's podcast episode the night before, keep your flashcard deck trimmed to words you actually met in real content, and choose listening material just slightly above your level — understandable, but not comfortable. If you miss the review step one evening, skip it guilt-free: clearing yesterday's cards tomorrow still counts.

## A Week of Variation

Keep the 15-minute shell identical but rotate the content so it never goes stale:

• **Monday / Wednesday / Friday:** new material — a fresh dialogue, new flashcards, one new grammar pattern.

• **Tuesday / Thursday:** review days — re-listen to Monday's audio, re-test this week's words.

• **Saturday:** fun day — a Chinese song, a cartoon episode, a menu you decode. Enjoyment is retention.

• **Sunday:** light review plus two minutes of planning — what will next week's material be?

Progress at this pace is quiet, so measure it gently: once a week, re-read a dialogue from a month ago and notice how much more of it you understand, or re-record the same self-introduction every month and compare the recordings. Visible proof beats motivation dips — the calendar shows effort, but these two little checks show results.

## Building the Habit (the Honest Part)

• **Anchor it.** Attach the session to something you already do daily — after morning coffee, before lunch, right after closing the laptop.

• **Same time, same place.** A fixed chair and a fixed playlist cut the startup cost to zero. Decisions are the enemy; routines are armor. If you travel, take the same setup with you — headphones, phone, one saved episode.

• **Track it visibly.** A paper calendar with a cross per day (the Jerry Seinfeld method) or a habit app. After two weeks, the streak itself becomes motivation.

• **Use the two-minute rule.** On terrible days, do two minutes. The identity — "I'm someone who studies Chinese every day" — is the real asset, and two minutes protects it.

## The Takeaway

Set a fixed 15-minute slot tonight, load your flashcard app and one podcast episode, and run the routine exactly as written for two weeks before judging it. If you miss a day, you miss a day — just show up the next morning. On busy weeks, keep the routine smaller rather than bigger: 15 protected minutes beat 40 attempted and abandoned ones. Ninety hours a year of real Mandarin starts with the first fifteen minutes tomorrow.`,
  },
  {
    slug: 'chinese-culture-through-language',
    title: 'What Chinese Reveals About Chinese Culture (Through the Words Themselves)',
    tag: 'culture',
    emoji: '🏮',
    color: 'peach',
    excerpt:
      "Titles like 老师 and 师傅, greetings asking if you've eaten, four-character idioms, festival words — how Mandarin carries culture inside its vocabulary.",
    content: `Languages carry culture the way rivers carry sediment — quietly, everywhere. Mandarin is full of vocabulary that only makes sense once you see the values behind it. Below are five windows into Chinese culture you can look through while learning words you would need anyway. These are observations, not rules — real China is far more diverse and modern than any list of cultural notes suggests.

## Titles of Respect: 老师 and 师傅

Teachers hold a special place, and the word shows it: 老师 (lǎoshī) means teacher, but it also works as a respectful title for anyone with expertise — people address senior colleagues, experts, and admired artists as 老师. Meanwhile 师傅 (shīfu), literally "master," survives from the master-apprentice tradition (师徒, shītú) and is today a polite way to address skilled workers — drivers, repair people, cooks. Calling a taxi driver 师傅 is both correct and appreciated. The pattern: skill, and the willingness to pass it on, earn honorifics.

## Have You Eaten? Greetings With History

An older generation greets friends with 吃了吗？(Chī le ma?) — "Have you eaten?" It puzzles visitors the first time, but it is simply an ordinary hello, born of eras when a full meal was not guaranteed and asking showed you cared about someone's basic wellbeing. Today it signals warmth between acquaintances, especially with elders and in smaller cities — it is a greeting, not a dinner invitation. Younger people mostly say 你好 or an easy 嗨 (hāi). Knowing the history keeps you from politely accepting a meal you were never actually offered.

## Family Words: Everyone Gets a Precise Name

Chinese family vocabulary is famously specific: 哥哥 (gēge, older brother), 姐姐 (jiějie, older sister), 弟弟 (dìdi, younger brother), 妹妹 (mèimei, younger sister) — birth order is baked into the words. Cousins go further, specifying side and seniority: 表哥 (biǎogē) is an older male cousin through aunts or on the mother's side, 堂弟 (tángdì) a younger paternal-line cousin. One practical effect: relative age shapes everyday politeness. It also spills into public life — strangers address young men as 大哥 (dàgē, big brother), women as 大姐 (dàjiě, big sister), and children as 小朋友 (xiǎopéngyou, little friend). The family metaphor extends warmth politely; it does not literally claim kinship.

## Chengyu: Idioms as Compressed Stories

Four-character idioms called 成语 (chéngyǔ) are entire folk stories folded into four syllables, and they appear in normal conversation, news, and speeches:

• **画蛇添足 (huà shé tiān zú)** — "drawing a snake and adding feet." From a contest where the winner ruined his victory by decorating his finished snake. Meaning: spoiling something by needless addition.

• **井底之蛙 (jǐng dǐ zhī wā)** — "the frog at the bottom of a well." It thinks the sky is one small circle. Meaning: a narrow perspective.

• **塞翁失马 (sài wēng shī mǎ)** — "the old man lost his horse," which returned leading a herd. Meaning: fortune can disguise itself as misfortune.

Learn one chengyu and you get vocabulary, a story, and a cultural reference point in a single package.

## Speaking the Festivals

Festival vocabulary teaches values directly. At 春节 (Chūnjié, Spring Festival) people 拜年 (bàinián, pay New Year visits), give 红包 (hóngbāo, red envelopes), and bless each other 年年有余 (nián nián yǒu yú, "surplus every year") — a pun, since 余 (yú, surplus) sounds exactly like 鱼 (yú, fish), which is why fish appears on the New Year table. 中秋节 (Zhōngqiū jié, Mid-Autumn Festival) revolves around 月饼 (yuèbǐng, mooncakes) and 团圆 (tuányuán, family reunion) — the roundness of the moon and the wholeness of the family are the same idea in one word. At 端午节 (Duānwǔ jié, Dragon Boat Festival), 粽子 (zòngzi, sticky rice bundles) and 龙舟 (lóngzhōu, dragon boats) tie language to two thousand years of shared memory.

## The Takeaway

Pick one of these five windows each week and learn its core words deeply — titles, greetings, family terms, one chengyu, one festival — rather than skimming all of them at once. Language learning and culture learning are the same activity wearing different clothes, and words remember themselves better when they come with a story.`,
  },
  {
    slug: '10-expressions-literal-meaning',
    title: '10 Chinese Expressions Whose Literal Translation Is Only Half the Story',
    tag: 'culture',
    emoji: '🎭',
    color: 'sage',
    excerpt:
      "'Horse horse tiger tiger,' 'add oil,' 'eat vinegar' — ten genuine Mandarin expressions whose real meaning is nothing like their word-for-word translation.",
    content: `Every language has expressions that collapse when you translate them word by word — and Mandarin has some wonderful ones. These ten are all genuinely used in daily conversation, and each one carries a small story about history, food, animals, or politeness. Learn them and you will start hearing them everywhere.

## Why Word-for-Word Translation Fails

Idioms exist because speakers compress shared experience into short phrases. A literal translation is like reading the ingredient list instead of tasting the dish: technically correct, entirely different experience. The ten below are grouped by theme — animals, food, politeness, and encouragement.

## Animals Hard at Work

• **马马虎虎 (mǎmǎhuhu)** — literally "horse horse tiger tiger," means **so-so; careless**. Legend credits a careless painter whose horse-tiger hybrid confused everyone who saw it. Example: 你的中文怎么样？(Nǐ de Zhōngwén zěnmeyàng?) 马马虎虎。(Mǎmǎhuhu.) — How's your Chinese? So-so.

• **拍马屁 (pāi mǎpì)** — "pat the horse's rump," means **to flatter someone shamelessly**. It is said to come from nomad culture, where complimenting a rider's horse was the original schmooze. Example: 他总是在老板面前拍马屁。(Tā zǒngshì zài lǎobǎn miànqián pāi mǎpì.) — He's always sucking up to the boss.

• **马上 (mǎshàng)** — "on the horse," means **immediately, right away**. One folk story blames the horse-riding messengers of old: jump on the horse and go at once. Example: 马上来！(Mǎshàng lái!) — Coming right now!

## Food and Feelings

• **吃醋 (chīcù)** — "eat vinegar," means **to be jealous, especially in romance**. From a famous Tang-dynasty story in which an emperor offered a defiant wife a "poison" that was actually vinegar — and she drank it bravely. Example: 她吃醋了。(Tā chīcù le.) — She got jealous.

• **东西 (dōngxi)** — "east west," means **thing, stuff**. Historians often link it to the great East and West Markets of Tang-era Chang'an, where one went shopping. Example: 我忘带东西了。(Wǒ wàng dài dōngxi le.) — I forgot to bring my things. Careful: using 东西 for a person is an insult, so keep it for objects.

## Politeness, Translated Honestly

• **不客气 (bú kèqi)** — "don't be polite," means **you're welcome**. It reflects a hospitality culture where hosts keep urging guests to relax and take more. Example: 谢谢你的茶！(Xièxie nǐ de chá!) 不客气！(Bú kèqi!)

• **哪里哪里 (nǎlǐ nǎlǐ)** — "where, where?" means **a humble deflection of praise** — roughly "oh, you flatter me." Example: 你的中文真好！哪里哪里。(Nǐ de Zhōngwén zhēn hǎo! Nǎlǐ nǎlǐ.) — Your Chinese is wonderful! Oh, you're too kind. Younger speakers increasingly just say 谢谢 — languages evolve.

• **慢走 (màn zǒu)** — "walk slowly," means **take care, goodbye** — said by hosts to departing guests. It wishes an unhurried, safe road, not an actual speed. Example: 慢走，欢迎再来！(Màn zǒu, huānyíng zài lái!) — Take care, come again!

## Battle Cries and Promises

• **加油 (jiāyóu)** — "add oil," means **keep going! you've got this!** Originally about feeding lamps and refueling engines, it became the all-purpose Chinese cheer — shouted at marathons, typed before exams, and official enough that "add oil" entered the Oxford English Dictionary in 2018. Example: 考试加油！(Kǎoshì jiāyóu!) — Good luck on your exam!

• **不见不散 (bú jiàn bú sàn)** — "not see, not leave," means **be there or be square** — a firm, friendly promise to wait until you show up. Example: 明天七点，公园门口，不见不散！(Míngtiān qī diǎn, gōngyuán ménkǒu, bú jiàn bú sàn!) — Tomorrow at seven, at the park gate — be there!

## The Takeaway

Choose three of these expressions this week and use each one in a real conversation or message — idioms only become yours when they leave your notes. And whenever a literal translation sounds absurd, treat it as a clue: there is usually a story behind it, and the story is exactly what makes the phrase stick.`,
  },
]

// 🔍 اعتبارسنجی قالب (غیرمخرب — فقط هشدار در کنسول)
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
