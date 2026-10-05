// =====================================================================
//  📝 فایل محتوای سایت «Chinese Toon»
// =====================================================================
//  👋 سلام! این فایل، «مغز» سایت شماست.
//  تمام متن‌های سایت اینجا جمع شده است — برای تغییر محتوا فقط همین
//  فایل را ویرایش کنید، بدون اینکه به کد صفحات دست بزنید.
//
//  نکات مهم:
//  • متن بین دو علامت "..." را عوض کنید؛ ساختار (کاما، براکت) را
//    دست نزنید تا سایت خراب نشود.
//  • برای افزودن یک آیتم جدید (مثلاً یک کلاس یا سؤال متداول جدید)
//    کافی است بلوک مشابهِ بالا/پایین را کپی کنید و ویرایش کنید.
//  • بعد از ذخیرهٔ فایل، سایت خودبه‌خود با محتوای جدید بالا می‌آید.
// =====================================================================

export const siteContent = {
  // ---------------------------------------------------------------
  //  🔧 اطلاعات کلی برند (نام، لوگو، شبکه‌های اجتماعی)
  // ---------------------------------------------------------------
  brand: {
    name: "Chinese Toon", // نام سایت
    logoChar: "椿", // حرف چینی داخل لوگو
    tagline: "Learn Chinese. One Toon at a Time.", // شعار پایین فوتر
    description:
      "Learn Mandarin Chinese through creative content and practical classes. Structured learning, engaging teaching, real progress.", // توضیح کوتاه در فوتر
    copyright: "© 2025 Chinese Toon. All rights reserved.",
  },

  // ---------------------------------------------------------------
  //  📞 راه‌های ارتباطی (در صفحهٔ پشتیبانی، فوتر و صفحهٔ درباره ما)
  // ---------------------------------------------------------------
  contact: {
    email: "chinese.toon.org@gmail.com", // ایمیل پشتیبانی — ایمیل واقعی برند
    responseTime: "We usually reply within 24 hours on business days.", // زمان پاسخ‌گویی
    // 🌐 آدرس اصلی سایت — برای سئو، نقشهٔ سایت و پیش‌نمایش اشتراک‌گذاری استفاده می‌شود
    siteUrl: "https://www.chinesetoon.com", // 👈 اگر دامنه عوض شد فقط همین را تغییر دهید (با www — کاننیکال تولید)
    socials: {
      // 🔗 آدرس‌های کامل مقصد — مستقیماً روی آیکون‌ها استفاده می‌شوند.
      // این مقادیر دیگر «هندل» نیستند؛ URL کامل هستند تا پارامترهایی مثل
      // ?stkn= اینستاگرام و لینک کوتاه u.wechat.com پشتیبانی شوند.
      instagram: "https://www.instagram.com/chinese_toon?stkn=ZXUzOGtzeDZuYWM3",
      telegram: "https://t.me/Chinese_toon_support",
      wechat: "https://u.wechat.com/kIy5ADbROlbIgMxEWkk0jZQ?s=3",
    },
  },

  // ---------------------------------------------------------------
  //  🏠 صفحهٔ خانه (Hero)
  // ---------------------------------------------------------------
  home: {
    hero: {
      badge: "Mandarin Chinese Learning", // برچسب کوچک بالای تیتر
      titleTop: "Learn Chinese.", // سطر اول تیتر بزرگ
      titleMiddle: "Have Fun.", // سطر دوم
      titleHighlight: "Make Progress.", // سطر سوم (به رنگ سبز)
      subtitle:
        "Learn Mandarin Chinese through engaging content and practical, teacher-led classes.", // توضیح زیر تیتر
      primaryButton: "Join a Class", // دکمهٔ اصلی
      secondaryButton: "Explore Classes", // دکمهٔ ثانویه
      // 🌿 تصویر سمت راست هیرو حالا «نشان برند» است: بازآفرینی وکتوری لوگوی
      // شاخهٔ درخت تُون در کامپوننت src/components/site/ToonBranch.tsx
      // (برگ‌ها، خوشهٔ توت و گل‌های سفید — دقیقاً با رنگ‌های خود لوگو).
    },
    // -------------------------------------------------------------
    //  🧭 ناوبری بخش‌های صفحهٔ خانه (زیر منوی اصلی، چسبان)
    //  با اسکرول، خط زیر آیتم فعال حرکت می‌کند؛ با کلیک، صفحه به همان بخش می‌رود.
    //  👇 برای کم/زیاد کردن آیتم‌ها این لیست را ویرایش کنید
    //     (id باید با id سکشن در HomePage.tsx یکی باشد)
    // -------------------------------------------------------------
    sectionNav: [
      { id: "why", label: "Why Us" },
      { id: "classes", label: "Classes" },
      { id: "free", label: "Free Content" },
      { id: "reviews", label: "Reviews" },
      { id: "word", label: "Word of Day" },
      { id: "blog", label: "Blog" },
    ],
    // بخش «چرا ما را انتخاب کنید» — ۴ کارت
    whyChooseUs: {
      eyebrow: "Why Choose Us",
      title: "Why Learn with Chinese Toon?",
      subtitle:
        "We combine creative content with structured teaching to make your Chinese learning journey effective and enjoyable.",
      cards: [
        {
          icon: "message-circle",
          color: "sage",
          title: "Practical Learning",
          text: "Learn Chinese for real-life communication and everyday situations.",
        },
        {
          icon: "sparkles",
          color: "butter",
          title: "Engaging Content",
          text: "Make learning more enjoyable through creative and memorable content.",
        },
        {
          icon: "book-open",
          color: "peach",
          title: "Structured Classes",
          text: "Follow a clear learning path with organized lessons and professional instruction.",
        },
        {
          icon: "heart-handshake",
          color: "sage",
          title: "Supportive Environment",
          text: "Learn in a friendly environment where students can build confidence step by step.",
        },
      ],
    },
    exploreClasses: {
      eyebrow: "Our Classes",
      title: "Explore Our Classes",
      subtitle:
        "Find the right class for your level and start making progress in Chinese.",
      viewAllButton: "View All Classes",
    },
    // بخش «رایگان شروع کنید» (سه کارت محتوای رایگان)
    // 👇 lesson = کلید درس در learn.lessons — با کلیک روی Learn، همان درس در صفحهٔ Learn باز می‌شود
    freeContent: {
      eyebrow: "Free Content",
      title: "Start Learning for Free",
      subtitle:
        "Explore our free Chinese learning content — no registration required.",
      cards: [
        {
          color: "sage",
          big: "你好",
          small: "nǐ hǎo",
          tag: "Vocabulary",
          title: "Basic Greetings",
          text: "Learn essential Chinese greetings for your first conversation.",
          lesson: "greetings",
        },
        {
          color: "butter",
          big: "吃",
          small: "chī · to eat",
          tag: "Characters",
          title: "Food & Drink Words",
          text: "Master vocabulary for ordering food and talking about meals.",
          lesson: "food",
        },
        {
          color: "peach",
          big: "😊",
          small: "Expressing feelings",
          tag: "Everyday Chinese",
          title: "How Are You?",
          text: "Learn to express feelings and ask about others in Chinese.",
          lesson: "feelings",
        },
      ],
    },
    // بخش اعتماد (۶ ویژگی)
    trust: {
      title: "A Better Way to Learn Chinese",
      subtitle:
        "Chinese Toon combines the best of creative content and structured education.",
      items: [
        {
          icon: "graduation-cap",
          color: "sage",
          title: "Structured, Teacher-Led Classes",
          text: "Professional instruction with a clear learning path from beginner to advanced.",
        },
        {
          icon: "lightbulb",
          color: "butter",
          title: "Practical Chinese",
          text: "Focus on real-life communication — speaking, listening, and everyday use.",
        },
        {
          icon: "palette",
          color: "peach",
          title: "Creative Learning Content",
          text: "Animated lessons and engaging media make Chinese memorable and fun.",
        },
        {
          icon: "footprints",
          color: "sage",
          title: "Beginner-Friendly Path",
          text: "Start from zero and build confidence step by step with supportive guidance.",
        },
        {
          icon: "users",
          color: "butter",
          title: "Supportive Environment",
          text: "Learn alongside fellow students in a friendly, encouraging atmosphere.",
        },
        {
          icon: "globe",
          color: "peach",
          title: "Cultural Understanding",
          text: "Go beyond language — understand the culture and context behind the words.",
        },
      ],
    },
    // 🌿 دعوت پایانی صفحهٔ خانه (CTA) — پس‌زمینهٔ سبز سیجِ پررنگ با متن کرم
    finalCta: {
      eyebrow: "Ready to start?",
      title: "Ready to grow your Chinese?",
      subtitle:
        "Book a free trial lesson today — meet your teacher, pick your level, and see how fun real progress feels.",
      primaryButton: "Book a Free Trial", // دکمهٔ اصلی → صفحهٔ ثبت‌نام
      secondaryButton: "Browse Classes", // دکمهٔ ثانویه → صفحهٔ کلاس‌ها
    },
    // ⭐ کاروسل نظرات دانشجویان در صفحهٔ خانه (بخش مستقل #reviews)
    //    ۳ کارت تمام + لبهٔ کارت بعدی کمی دیده می‌شود (peek)
    //    نظرات تأییدشدهٔ کاربران + نظرات ثابت زیر با هم نمایش داده می‌شوند
    reviewsCarousel: {
      eyebrow: "Student Reviews",
      title: "What do our students say?",
      subtitle:
        "Real stories from real learners — approved reviews from our community and our students.",
      writeButton: "Write a Review", // دکمهٔ رفتن به صفحهٔ نظرات (#/reviews)
      viewAll: "View all reviews",
      prev: "Previous review",
      next: "Next review",
    },
    // بخش «آخرین مقالات وبلاگ» در صفحهٔ خانه (۳ مقالهٔ آخر نمایش داده می‌شود)
    blogSection: {
      eyebrow: "From the Blog",
      title: "Latest Articles & Tips",
      subtitle:
        "Study tips, culture stories, and class news from our teachers.",
      readMore: "Read article",
      visitButton: "Visit the Blog", // دکمهٔ رفتن به صفحهٔ وبلاگ
    },
    // ---------------------------------------------------------------
    //  📅 کلمهٔ روز (每日一词) — در صفحهٔ خانه
    //  هر روز یک کلمه به‌صورت خودکار عوض می‌شود (چرخش روزانه بر اساس تاریخ)
    //  👇 برای افزودن کلمهٔ جدید یک بلوک کپی کنید
    // ---------------------------------------------------------------
    wordOfDay: {
      eyebrow: "Word of the Day · 每日一词",
      title: "Learn a Word Today",
      subtitle:
        "A small daily bite of Chinese — tap the speaker to hear it, come back tomorrow for a new one.",
      // دکمهٔ تلفظ (صدای مرورگر — اینترنت لازم ندارد)
      speakLabel: "Hear it",
      speakingLabel: "Playing...", // هنگام پخش صدا
      speakSentenceLabel: "Hear the sentence", // 🔈 دکمهٔ پخش جملهٔ نمونه (صدای هوش مصنوعی)
      anotherLabel: "Another word", // دکمهٔ دیدن کلمهٔ تصادفی دیگر
      registerCta: "Want to learn more? Join a class!", // دکمهٔ رفتن به کلاس‌ها
      // 🔈 کلمات (روی کارت: کاراکتر، پین‌یین، معنی، جملهٔ نمونه)
      words: [
        {
          chinese: "你好",
          pinyin: "nǐ hǎo",
          meaning: "Hello",
          example: "你好！很高兴认识你。",
          exampleTranslation: "Hello! Nice to meet you.",
        },
        {
          chinese: "谢谢",
          pinyin: "xièxie",
          meaning: "Thank you",
          example: "谢谢你的帮助！",
          exampleTranslation: "Thank you for your help!",
        },
        {
          chinese: "朋友",
          pinyin: "péngyou",
          meaning: "Friend",
          example: "他是我的好朋友。",
          exampleTranslation: "He is my good friend.",
        },
        {
          chinese: "水",
          pinyin: "shuǐ",
          meaning: "Water",
          example: "我要一杯水，谢谢。",
          exampleTranslation: "I'd like a glass of water, please.",
        },
        {
          chinese: "漂亮",
          pinyin: "piàoliang",
          meaning: "Beautiful, pretty",
          example: "这个公园真漂亮！",
          exampleTranslation: "This park is really beautiful!",
        },
        {
          chinese: "吃饭",
          pinyin: "chī fàn",
          meaning: "To eat (a meal)",
          example: "我们一起吃饭吧！",
          exampleTranslation: "Let's eat together!",
        },
        {
          chinese: "学习",
          pinyin: "xuéxí",
          meaning: "To study, to learn",
          example: "我每天学习中文。",
          exampleTranslation: "I study Chinese every day.",
        },
        {
          chinese: "茶",
          pinyin: "chá",
          meaning: "Tea",
          example: "你喜欢喝中国茶吗？",
          exampleTranslation: "Do you like drinking Chinese tea?",
        },
        {
          chinese: "猫",
          pinyin: "māo",
          meaning: "Cat",
          example: "这只小猫很可爱。",
          exampleTranslation: "This little cat is so cute.",
        },
        {
          chinese: "加油",
          pinyin: "jiāyóu",
          meaning: "Keep going! You got it!",
          example: "明天考试，加油！",
          exampleTranslation: "The exam is tomorrow — you got this!",
        },
        {
          chinese: "明天",
          pinyin: "míngtiān",
          meaning: "Tomorrow",
          example: "明天见！",
          exampleTranslation: "See you tomorrow!",
        },
        {
          chinese: "喜欢",
          pinyin: "xǐhuan",
          meaning: "To like",
          example: "我很喜欢学中文。",
          exampleTranslation: "I really like learning Chinese.",
        },
        {
          chinese: "老师",
          pinyin: "lǎoshī",
          meaning: "Teacher",
          example: "王老师教得很好。",
          exampleTranslation: "Teacher Wang teaches very well.",
        },
        {
          chinese: "再见",
          pinyin: "zàijiàn",
          meaning: "Goodbye",
          example: "老师再见，明天见！",
          exampleTranslation: "Goodbye teacher, see you tomorrow!",
        },
      ],
    },
  },

  // ---------------------------------------------------------------
  //  🎓 صفحهٔ کلاس‌ها
  // ---------------------------------------------------------------
  classes: {
    eyebrow: "Course Catalog",
    title: "Our Chinese Classes",
    subtitle:
      "Find the perfect class for your level and goals. All classes are taught by experienced teachers.",
    // فیلترها — کلید (key) را تغییر ندهید؛ فقط label
    filters: [
      { key: "all", label: "All" },
      { key: "beginner", label: "Beginner" },
      { key: "elementary", label: "Elementary" },
      { key: "intermediate", label: "Intermediate" },
      { key: "conversation", label: "Conversation" },
    ],
    // دکمهٔ نمایش جزئیات هر کلاس (پنجرهٔ توضیحات)
    detailsButton: "Details",
    detailsTitle: "Class Details",
    whatYouLearn: "What you'll learn",
    priceLabel: "Price",
    detailsNote: "First trial session is free — come and see if it fits!",
    // 🎟️ تخفیف بسته + کد تخفیف (فاز ۴۷) — ارائهٔ شفاف، بدون فریب و بدون شمارندهٔ قلابی
    discount: {
      saveLabel: "You save {amount}",
      packageOf: "{sessions} sessions × {perSession} per session",
      haveCode: "Have a discount code?",
      placeholder: "e.g. CHINESE10",
      apply: "Apply",
      remove: "Remove",
      invalidCode: "This code is not valid for this class.",
    },
    // 🖨️ دکمهٔ چاپ/ذخیرهٔ PDF برنامهٔ کلاس‌ها (فاز ۲۲)
    printButton: "Print Schedule",
    // -------------------------------------------------------------
    // 🎯 سکشن تبلیغاتی «دورهٔ آمادگی HSK» (جدید!) — هدف: تبلیغات و لینک مستقیم
    //    enabled را false کنید تا کل سکشن از سایت برداشته شود.
    //    ⏰ examDate = تاریخ و ساعت آزمون بعدی HSK (به‌صورت ISO). وقتی این
    //    تاریخ بگذرد، سکشن خودکار به حالت «تاریخ جدید به‌زودی» می‌رود.
    //    features = نکات کلیدی دوره (با تیک سبز نمایش داده می‌شود)
    // -------------------------------------------------------------
    hskPromo: {
      enabled: true, // 👈 برای پنهان کردن سکشن، false کنید
      eyebrow: "HSK Prep Program",
      title: "Pass the HSK with confidence",
      text: "A focused 8-week bootcamp: past papers, timed mock exams, vocabulary sprints, and one-on-one feedback — so you walk into the exam room calm and ready.",
      features: [
        "6 full mock exams with real timing conditions",
        "HSK 1–6 vocabulary covered in weekly sprints",
        "Listening & reading strategies from a certified coach",
        "Personal feedback on every writing task",
      ],
      examDate: "2026-12-06T09:00:00+03:30", // 👈 تاریخ آزمون بعدی HSK
      examLabel: "Next HSK exam session",
      daysLabel: "Days",
      hoursLabel: "Hours",
      minutesLabel: "Min",
      secondsLabel: "Sec",
      closedTitle: "New exam dates coming soon",
      closedText:
        "The registration window for the next HSK session hasn't opened yet. Join the waitlist and we'll notify you the moment it does.",
      cta: "Reserve My HSK Spot",
      enrollNote: "Limited seats per cohort — registration closes 3 weeks before the exam.",
    },
    // لیست کلاس‌ها — برای افزودن کلاس جدید یک بلوک کپی کنید
    // نکته: «category» باید یکی از کلیدهای فیلتر بالا باشد (به‌جز all)
    // price = قیمت نمایشی، highlights = سرفصل‌های داخل پنجرهٔ جزئیات
    // image = تصویر کاور کارت (اختیاری — خالی/حذفشده = نوار رنگی ساده)
    items: [
      {
        category: "beginner",
        color: "sage",
        image: "/images/classes/beginner.png",
        level: "HSK 1",
        type: "Group Class",
        title: "Beginner Chinese",
        text: "Start Mandarin from the basics and build a strong foundation in pronunciation, characters, and simple communication.",
        meta: [
          { icon: "monitor", text: "Online" },
          { icon: "clock", text: "12 sessions · 60 min each" },
          { icon: "users", text: "Small group (4–8 students)" },
        ],
        schedule: "Schedule: TBC",
        price: "$12 / session",
        priceNote: "12-session package: $130",
        highlights: [
          "Pinyin & the four tones from zero",
          "80+ essential words for daily life",
          "Reading 60+ common characters",
          "Simple self-introduction & small talk",
        ],
      },
      {
        category: "elementary",
        color: "butter",
        image: "/images/classes/elementary.png",
        level: "HSK 2–3",
        type: "Group Class",
        title: "Elementary Chinese",
        text: "Improve vocabulary, grammar, listening, and everyday communication skills beyond the basics.",
        meta: [
          { icon: "monitor", text: "Online" },
          { icon: "clock", text: "16 sessions · 60 min each" },
          { icon: "users", text: "Small group (4–8 students)" },
        ],
        schedule: "Schedule: TBC",
        price: "$14 / session",
        priceNote: "16-session package: $200",
        highlights: [
          "Everyday dialogues: shopping, travel, food",
          "Grammar patterns for daily conversation",
          "Listening practice with real materials",
          "Writing short messages & notes",
        ],
      },
      {
        category: "conversation",
        color: "peach",
        image: "/images/classes/conversation.png",
        level: "Conversation",
        type: "Group / Private",
        title: "Conversational Chinese",
        text: "Develop speaking and listening skills through practical, real-life conversations and interactive practice.",
        meta: [
          { icon: "monitor", text: "Online" },
          { icon: "clock", text: "10 sessions · 45 min each" },
          { icon: "mic", text: "Interactive & speaking-focused" },
        ],
        schedule: "Schedule: TBC",
        price: "$15 / session",
        priceNote: "10-session package: $135",
        highlights: [
          "Real-life role plays & scenarios",
          "Common slang and natural expressions",
          "Improving fluency and confidence",
          "Pronunciation fine-tuning",
        ],
      },
      {
        category: "intermediate",
        color: "sage",
        image: "/images/classes/intermediate.png",
        level: "HSK 4",
        type: "Group Class",
        title: "Intermediate Chinese",
        text: "Expand your vocabulary, master complex grammar, and communicate confidently on a wide range of topics.",
        meta: [
          { icon: "monitor", text: "Online" },
          { icon: "clock", text: "16 sessions · 60 min each" },
          { icon: "users", text: "Small group (4–8 students)" },
        ],
        schedule: "Schedule: TBC",
        price: "$14 / session",
        priceNote: "16-session package: $200",
        highlights: [
          "Opinions, feelings & abstract topics",
          "Long-form listening comprehension",
          "Structured writing (emails, short essays)",
          "Chinese culture & idioms (chengyu)",
        ],
      },
      {
        category: "intermediate",
        color: "butter",
        image: "/images/classes/hsk-prep.png",
        level: "HSK Prep",
        type: "Private / Group",
        title: "HSK Preparation",
        text: "Targeted preparation for HSK exams with practice tests, strategies, and focused skill development.",
        meta: [
          { icon: "monitor", text: "Online" },
          { icon: "clock", text: "8 sessions · 90 min each" },
          { icon: "target", text: "Exam-focused training" },
        ],
        schedule: "Schedule: TBC",
        price: "$18 / session",
        priceNote: "8-session package: $135",
        highlights: [
          "Full mock exams with timing",
          "High-frequency vocabulary review",
          "Test strategies for each section",
          "Personal feedback on weak areas",
        ],
      },
      {
        category: "beginner elementary intermediate conversation",
        color: "peach",
        image: "/images/classes/private.png",
        level: "All Levels",
        type: "Private",
        title: "Private Lessons",
        text: "Personalized one-on-one instruction tailored to your level, goals, and schedule.",
        meta: [
          { icon: "monitor", text: "Online" },
          { icon: "clock", text: "Flexible scheduling" },
          { icon: "user", text: "1-on-1 personalized" },
        ],
        schedule: "Flexible schedule",
        price: "$25 / session",
        priceNote: "Flexible packages — pay as you go",
        highlights: [
          "A plan built only for your goals",
          "Business, travel or exam focus",
          "Flexible timing across time zones",
          "Detailed progress reports",
        ],
      },
    ],
    helpBox: {
      title: "Not sure which class is right for you?",
      text: "Tell us about your experience and goals, and we'll help you find the perfect fit.",
      button: "Join a Class",
    },
  },

  // ---------------------------------------------------------------
  //  📚 صفحهٔ یادگیری (محتوای رایگان)
  // ---------------------------------------------------------------
  learn: {
    eyebrow: "Free Learning Content",
    title: "Learn with Chinese Toon",
    subtitle:
      "Explore free Chinese lessons, vocabulary, animated content, and everyday expressions.",
    filters: [
      { key: "all", label: "All" },
      { key: "vocabulary", label: "Vocabulary" },
      { key: "everyday", label: "Everyday Chinese" },
      { key: "pronunciation", label: "Pronunciation" },
      { key: "grammar", label: "Grammar" },
      { key: "culture", label: "Culture" },
      { key: "hsk", label: "HSK Prep" },
    ],
    // کارت‌های محتوای آموزشی — برای افزودن، بلوک را کپی کنید
    items: [
      {
        category: "vocabulary",
        color: "sage",
        tag: "Vocabulary",
        big: "你好",
        small: "nǐ hǎo",
        title: "Basic Greetings",
        text: "Learn essential Chinese greetings for your first conversation.",
        action: "Learn",
        lesson: "greetings",
      },
      {
        category: "everyday",
        color: "butter",
        tag: "Everyday Chinese",
        big: "吃饭",
        small: "chī fàn · to eat",
        title: "Food & Ordering",
        text: "Master vocabulary and phrases for restaurants and meals.",
        action: "Learn",
        lesson: "food",
      },
      {
        category: "pronunciation",
        color: "peach",
        tag: "Pronunciation",
        big: "ü",
        small: "The tricky vowel",
        title: "Pinyin: Tones & Sounds",
        text: "Master Chinese pronunciation starting with the four tones.",
        action: "Learn",
        lesson: "pinyin",
      },
      {
        category: "grammar",
        color: "cream",
        tag: "Grammar",
        big: "我是学生",
        small: "wǒ shì xuéshēng",
        title: "是 (shì) — The To Be Verb",
        text: "Learn to form basic sentences with China's most essential verb.",
        action: "Learn",
        lesson: "shi",
      },
      {
        category: "culture",
        color: "butter",
        tag: "Culture",
        big: "🧧",
        small: "红包",
        title: "Red Envelopes (红包)",
        text: "Discover the cultural meaning behind red envelopes in Chinese tradition.",
        action: "Learn",
        lesson: "hongbao",
      },
      {
        category: "hsk",
        color: "peach",
        tag: "HSK Prep",
        big: "HSK 1",
        small: "150 words",
        title: "HSK 1 Vocabulary List",
        text: "Complete word list and practice for the HSK 1 exam.",
        action: "Learn",
        lesson: "hsk1",
      },
      {
        category: "everyday vocabulary",
        color: "sage",
        tag: "Animated Lesson",
        isVideo: true,
        big: "今天天气怎么样？",
        small: "How's the weather today?",
        title: "Talking About Weather",
        text: "Animated lesson: weather expressions and how to use them.",
        action: "Watch",
        lesson: "weather",
      },
      {
        category: "vocabulary pronunciation",
        color: "cream",
        tag: "Characters",
        big: "学",
        small: "xué · to study",
        title: "Character: 学 (Study)",
        text: "Stroke order, meaning, and common words with 学.",
        action: "Learn",
        lesson: "xue",
      },
      {
        category: "everyday culture",
        color: "peach",
        tag: "Everyday Chinese",
        big: "加油！",
        small: "jiāyóu!",
        title: "Expressions of Encouragement",
        text: "From 加油 to 辛苦了 — cheer people on in Chinese!",
        action: "Learn",
        lesson: "jiayou",
      },
    ],
    moreNote: "More content is added regularly. Follow us to stay updated!",
    // -------------------------------------------------------------
    //  📚 محتوای درس‌ها (جدید!) — با کلیک روی دکمهٔ Learn هر کارت
    //  (یا کارت‌های Free Content صفحهٔ خانه) همین واژه‌ها در یک
    //  پنجرهٔ درس باز می‌شوند. کلید هر درس = فیلد lesson در items بالا
    //  👇 برای تغییر واژه‌های هر درس همین‌جا را ویرایش کنید
    // -------------------------------------------------------------
    lessons: {
      // متن‌های پنجرهٔ درس
      modal: {
        wordsTitle: "Words in this lesson",
        close: "Close lesson",
        registerCta: "Join a Class",
        registerNote: "Want to learn more? Our teachers cover this lesson in class.",
        speak: "Listen",
      },
      // 📚 صفحهٔ اختصاصی درس ‎#/lesson/<slug> (فاز ۲۲)
      detail: {
        backToLessons: "All lessons",
        notFoundTitle: "Lesson not found",
        notFoundText: "This lesson may have been unpublished or the link is wrong. Browse all lessons instead!",
        lessonBadge: "Lesson",
        speakSentence: "Hear the sentence", // 🔈 دکمهٔ پخش جملهٔ نمونهٔ هر واژه
      },
      greetings: {
        title: "Basic Greetings 你好",
        subtitle: "Your very first Chinese words — say hello, thank you and goodbye.",
        words: [
          { chinese: "你好", pinyin: "nǐ hǎo", meaning: "Hello", example: "Nǐ hǎo! Nice to meet you." },
          { chinese: "早上好", pinyin: "zǎoshang hǎo", meaning: "Good morning", example: "Zǎoshang hǎo, teacher!" },
          { chinese: "晚上好", pinyin: "wǎnshang hǎo", meaning: "Good evening", example: "Wǎnshang hǎo, everyone." },
          { chinese: "再见", pinyin: "zàijiàn", meaning: "Goodbye", example: "Zàijiàn — see you tomorrow!" },
          { chinese: "谢谢", pinyin: "xièxie", meaning: "Thank you", example: "Xièxie for your help!" },
          { chinese: "不客气", pinyin: "bú kèqi", meaning: "You're welcome", example: "— Xièxie! — Bú kèqi." },
        ],
      },
      food: {
        title: "Food & Drink Words 吃",
        subtitle: "Order food and talk about meals like a local.",
        words: [
          { chinese: "吃", pinyin: "chī", meaning: "To eat", example: "Wǒmen chīfàn ba — let's eat!" },
          { chinese: "喝", pinyin: "hē", meaning: "To drink", example: "Hē shuǐ — drink some water." },
          { chinese: "水", pinyin: "shuǐ", meaning: "Water", example: "Yì bēi shuǐ, please." },
          { chinese: "茶", pinyin: "chá", meaning: "Tea", example: "Zhōngguó chá hěn hǎo hē." },
          { chinese: "米饭", pinyin: "mǐfàn", meaning: "Rice", example: "Wǒ yào yì wǎn mǐfàn." },
          { chinese: "好吃", pinyin: "hǎochī", meaning: "Delicious", example: "Māma de cài hěn hǎochī!" },
        ],
      },
      feelings: {
        title: "How Are You? 你好吗",
        subtitle: "Ask how someone is and say how you feel.",
        words: [
          { chinese: "你好吗", pinyin: "nǐ hǎo ma", meaning: "How are you?", example: "Nǐ hǎo ma? — Wǒ hěn hǎo!" },
          { chinese: "我很好", pinyin: "wǒ hěn hǎo", meaning: "I'm fine", example: "Wǒ hěn hǎo, xièxie." },
          { chinese: "高兴", pinyin: "gāoxìng", meaning: "Happy", example: "Jīntiān wǒ hěn gāoxìng." },
          { chinese: "累", pinyin: "lèi", meaning: "Tired", example: "Xuéxí yì tiān, hěn lèi!" },
          { chinese: "难过", pinyin: "nánguò", meaning: "Sad", example: "Tā jīntiān yǒudiǎn nánguò." },
          { chinese: "生气", pinyin: "shēngqì", meaning: "Angry", example: "Bú yào shēngqì — don't be angry!" },
        ],
      },
      pinyin: {
        title: "Pinyin & The Four Tones",
        subtitle: "One sound, four meanings — meet mā má mǎ mà.",
        words: [
          { chinese: "妈", pinyin: "mā", meaning: "Mother (1st tone)", example: "Flat and high — like singing." },
          { chinese: "麻", pinyin: "má", meaning: "Hemp / numb (2nd tone)", example: "Rising — like a question." },
          { chinese: "马", pinyin: "mǎ", meaning: "Horse (3rd tone)", example: "Down then up — the dipping tone." },
          { chinese: "骂", pinyin: "mà", meaning: "To scold (4th tone)", example: "Sharp and falling!" },
          { chinese: "你好", pinyin: "nǐ hǎo", meaning: "3rd + 3rd → say ní hǎo", example: "Two 3rd tones blend together." },
        ],
      },
      shi: {
        title: "是 (shì) — The To Be Verb",
        subtitle: "The simplest Chinese sentence pattern: A 是 B.",
        words: [
          { chinese: "是", pinyin: "shì", meaning: "To be (am/is/are)", example: "Wǒ shì xuéshēng — I am a student." },
          { chinese: "我是学生", pinyin: "wǒ shì xuéshēng", meaning: "I am a student", example: "Your first full sentence!" },
          { chinese: "他是老师", pinyin: "tā shì lǎoshī", meaning: "He is a teacher", example: "Tā shì hěn hǎo de lǎoshī." },
          { chinese: "她是中国人", pinyin: "tā shì Zhōngguórén", meaning: "She is Chinese", example: "Tā shì Zhōngguórén." },
          { chinese: "这不是书", pinyin: "zhè bú shì shū", meaning: "This is not a book", example: "Negative: 不 + 是 = bú shì." },
        ],
      },
      hongbao: {
        title: "Red Envelopes 红包",
        subtitle: "The culture behind China's favourite gift.",
        words: [
          { chinese: "红包", pinyin: "hóngbāo", meaning: "Red envelope", example: "Hóngbāo = lucky money gift." },
          { chinese: "钱", pinyin: "qián", meaning: "Money", example: "Hóngbāo li yǒu qián!" },
          { chinese: "压岁钱", pinyin: "yāsuìqián", meaning: "New Year lucky money", example: "Kids love yāsuìqián!" },
          { chinese: "新年快乐", pinyin: "xīnnián kuàilè", meaning: "Happy New Year", example: "Xīnnián kuàilè! Gongxi gongxi!" },
          { chinese: "谢谢", pinyin: "xièxie", meaning: "Thank you", example: "Always say xièxie for a hóngbāo." },
        ],
      },
      hsk1: {
        title: "HSK 1 Vocabulary List",
        subtitle: "The first 150 words — start with these essentials.",
        words: [
          { chinese: "我", pinyin: "wǒ", meaning: "I / me", example: "Wǒ shì… — I am…" },
          { chinese: "你", pinyin: "nǐ", meaning: "You", example: "Nǐ hǎo!" },
          { chinese: "人", pinyin: "rén", meaning: "Person", example: "Sān gè rén — three people." },
          { chinese: "大", pinyin: "dà", meaning: "Big", example: "Dà xué — university (big school)." },
          { chinese: "小", pinyin: "xiǎo", meaning: "Small", example: "Xiǎo māo — kitten!" },
          { chinese: "爱", pinyin: "ài", meaning: "To love", example: "Wǒ ài nǐ." },
        ],
      },
      weather: {
        title: "Talking About Weather 天气",
        subtitle: "The #1 ice-breaker in any language — in Chinese!",
        words: [
          { chinese: "天气", pinyin: "tiānqì", meaning: "Weather", example: "Jīntiān tiānqì zěnmeyàng?" },
          { chinese: "今天天气很好", pinyin: "jīntiān tiānqì hěn hǎo", meaning: "The weather is great today", example: "The classic small talk line." },
          { chinese: "下雨", pinyin: "xiàyǔ", meaning: "To rain", example: "Xià yǔ le — it's raining!" },
          { chinese: "晴天", pinyin: "qíngtiān", meaning: "Sunny day", example: "Jīntiān shì qíngtiān." },
          { chinese: "热", pinyin: "rè", meaning: "Hot", example: "Jīntiān hěn rè!" },
          { chinese: "冷", pinyin: "lěng", meaning: "Cold", example: "Dōngtiān hěn lěng." },
        ],
      },
      xue: {
        title: "Character: 学 (Study)",
        subtitle: "One character, a whole family of words.",
        words: [
          { chinese: "学", pinyin: "xué", meaning: "To study / learn", example: "Wǒ xué Zhōngwén — I study Chinese." },
          { chinese: "学生", pinyin: "xuésheng", meaning: "Student", example: "Wǒ shì xuésheng." },
          { chinese: "学校", pinyin: "xuéxiào", meaning: "School", example: "Wǒmen de xuéxiào hěn dà." },
          { chinese: "学习", pinyin: "xuéxí", meaning: "To study", example: "Wǒ měitiān xuéxí Hànzì." },
          { chinese: "大学", pinyin: "dàxué", meaning: "University", example: "Tā zài dàxué jiào shū." },
        ],
      },
      jiayou: {
        title: "Expressions of Encouragement 加油",
        subtitle: "Cheer people on like a native speaker.",
        words: [
          { chinese: "加油", pinyin: "jiāyóu", meaning: "Come on! / Go go!", example: "Kǎoshì jiāyóu — good luck on the exam!" },
          { chinese: "好样的", pinyin: "hǎoyàng de", meaning: "Well done!", example: "Hǎoyàng de! You passed!" },
          { chinese: "没问题", pinyin: "méi wèntí", meaning: "No problem!", example: "— Can you help? — Méi wèntí!" },
          { chinese: "辛苦了", pinyin: "xīnkǔ le", meaning: "Thanks for your hard work", example: "Jīntiān xīnkǔ le!" },
          { chinese: "慢慢来", pinyin: "mànmàn lái", meaning: "Take it slow", example: "Mànmàn lái, bú yào zhāojí." },
        ],
      },
    },
    // -------------------------------------------------------------
    // 👂 بازی «تمرین تُن‌ها» (بخش جدید!) — گوش بده و تُن را حدس بزن
    //    enabled = خاموش/روشن کردن کل بازی
    //    صدا با صدای چینی دستگاه (zh-CN) پخش می‌شود؛ اگر نصب نبود،
    //    بازی خودکار به حالت «خواندن پین‌یین رنگی» می‌رود.
    //    لیست هجاها داخل فایل ToneTrainer.tsx است (واژه‌های استاندارد کلاس).
    // -------------------------------------------------------------
    toneTrainer: {
      enabled: true, // 👈 false = بازی از صفحهٔ Learn برداشته می‌شود
      eyebrow: "Ear Training",
      title: "Tone Trainer",
      subtitle:
        "Listen to a real Mandarin syllable and guess its tone. Four tones, one ear — how sharp is yours?",
      play: "Play sound",
      playAgain: "Play again",
      question: "Which tone did you hear?",
      tones: [
        { key: 1, label: "1st — flat", hint: "ā high & level" },
        { key: 2, label: "2nd — rising", hint: "á rises like asking" },
        { key: 3, label: "3rd — dip", hint: "ǎ falls then rises" },
        { key: 4, label: "4th — falling", hint: "à sharp drop" },
      ],
      correct: "Correct! You heard",
      wrong: "Almost — it was",
      next: "Next syllable",
      streakLabel: "Streak",
      bestLabel: "Best",
      roundLabel: "Round",
      noVoiceNote:
        "No Chinese voice found on this device — practice by reading the colored pinyin instead.",
      // 🪜 نردبان تُن‌ها — پخش تدریجی چهار تُنِ یک هجا پس از هر راند
      ladderButton: "Play all four tones",
      ladderHint: "Compare the tone ladder — tap any tile to replay it.",
    },

    // -------------------------------------------------------------
    //  🃏 فلش‌کارت واژگان — پایین صفحهٔ Learn (زیر آزمون تعیین سطح)
    //  یک کارت بزرگ در هر لحظه؛ کلیک = چرخش کارت و دیدن معنی
    //  👇 برای افزودن واژهٔ جدید، یک بلوک به cards اضافه کنید
    //     chinese: کاراکتر چینی | pinyin: تلفظ با علامت‌های تُن
    //     meaning: معنی انگلیسی | example: جملهٔ نمونهٔ انگلیسی
    // -------------------------------------------------------------
    flashcards: {
      eyebrow: "Vocabulary Flashcards",
      title: "Flip & Learn: Your First Words",
      subtitle:
        "Practice 8 essential words from HSK 1 — click the card to flip it and reveal the meaning.",
      cards: [
        {
          chinese: "你好",
          pinyin: "nǐ hǎo",
          meaning: "Hello",
          example: "Nǐ hǎo! It's so nice to meet you.",
        },
        {
          chinese: "谢谢",
          pinyin: "xièxie",
          meaning: "Thank you",
          example: "Xièxie for your help today!",
        },
        {
          chinese: "水",
          pinyin: "shuǐ",
          meaning: "Water",
          example: "Could I have a glass of water, please?",
        },
        {
          chinese: "猫",
          pinyin: "māo",
          meaning: "Cat",
          example: "Her little cat sleeps on the sofa all day.",
        },
        {
          chinese: "朋友",
          pinyin: "péngyou",
          meaning: "Friend",
          example: "My best friend is learning Chinese with me.",
        },
        {
          chinese: "漂亮",
          pinyin: "piàoliang",
          meaning: "Beautiful; pretty",
          example: "What a beautiful view of the city!",
        },
        {
          chinese: "吃饭",
          pinyin: "chīfàn",
          meaning: "To eat (a meal)",
          example: "Let's grab dinner together tonight.",
        },
        {
          chinese: "学习",
          pinyin: "xuéxí",
          meaning: "To study; to learn",
          example: "I study Chinese for twenty minutes every day.",
        },
      ],
      hint: "Click the card to flip it 👆",
      // دکمه‌های ناوبری کارت‌ها
      buttons: {
        prev: "Previous",
        next: "Next",
        shuffle: "Shuffle",
      },
    },

    // -------------------------------------------------------------
    //  🧩 آزمون تعیین سطح (Quick Level Check) — از تسک ۴۷ در تب Classes
    //  نمایش داده می‌شود (قبل از جعبهٔ راهنما). سؤالات قابل‌ویرایش از
    //  دیتابیس (تب Quiz پنل ادمین) می‌آیند و این بلوک fallback پیش‌فرض است.
    //  🧪 تسک ۸۳: زیرنویس معرفی از subtitleTemplate با «تعداد واقعی
    //  سؤال‌های دیتابیس» ساخته می‌شود تا متن هرگز از تعداد سؤال‌ها
    //  عقب نیفتد (قبلاً «۵ سؤال» ثابت بود و بعد از ارتقا به ۱۵ سؤال
    //  غیرواقعی و گمراه‌کننده شده بود — گزارش مالک).
    //  score هر گزینه: ۱ = مبتدی … ۴ = متوسط به بالا
    // -------------------------------------------------------------
    quiz: {
      eyebrow: "Level Quiz",
      title: "Quick Level Check",
      subtitle: "Answer 5 short questions and see which class fits you best — it takes less than a minute.",
      // 🧪 تسک ۸۳ — {count} = تعداد سؤال‌ها، {duration} = زمان تقریبی
      subtitleTemplate: "Answer {count} short questions and see which class fits you best — it takes {duration}.",
      durationShort: "less than a minute",
      durationMedium: "about a minute",
      durationLong: "about two minutes",
      questionOf: "Question",
      progressAria: "Quiz progress",
      // سؤالات — برای تغییر، متن گزینه‌ها را ویرایش کنید
      questions: [
        {
          q: "How much Chinese have you studied before?",
          options: [
            { text: "None at all — I'm brand new", score: 1 },
            { text: "A little — pinyin and some words", score: 2 },
            { text: "Around HSK 2 level", score: 3 },
            { text: "I've passed HSK 3 or higher", score: 4 },
          ],
        },
        {
          q: "Can you read Chinese characters?",
          options: [
            { text: "No, not yet", score: 1 },
            { text: "Only very common ones (你，我，好)", score: 2 },
            { text: "Yes, around 200–400 characters", score: 3 },
            { text: "Yes, 600+ characters comfortably", score: 4 },
          ],
        },
        {
          q: "How well do you understand spoken Mandarin?",
          options: [
            { text: "Almost nothing yet", score: 1 },
            { text: "Slow, simple phrases", score: 2 },
            { text: "Everyday conversations, most parts", score: 3 },
            { text: "Podcasts and videos quite well", score: 4 },
          ],
        },
        {
          q: "What can you do when speaking?",
          options: [
            { text: "I can't speak yet", score: 1 },
            { text: "Hello, thank you, numbers…", score: 2 },
            { text: "Simple daily conversations", score: 3 },
            { text: "Express opinions for minutes", score: 4 },
          ],
        },
        {
          q: "What is your main goal?",
          options: [
            { text: "Start from the very beginning", score: 1 },
            { text: "Strengthen my shaky basics", score: 2 },
            { text: "Get fluent in daily life", score: 3 },
            { text: "Reach HSK 4 and beyond", score: 4 },
          ],
        },
      ],
      // نتیجه‌ها بر اساس «باند» سطح (درصد پیشرفت محاسبه‌شدهٔ سمت سرور) — با هر تعداد سؤال کار می‌کند
      results: [
        {
          badge: "beginner",
          char: "你好",
          title: "Beginner — Start Here!",
          text: "Perfect! Our Beginner Chinese (HSK 1) class is designed exactly for you — from zero to your first real conversations.",
          class: "Beginner Chinese",
        },
        {
          badge: "elementary",
          char: "进步",
          title: "Elementary — Keep Growing!",
          text: "You have the basics — now let's make them solid. Elementary Chinese (HSK 2–3) will boost your vocabulary and confidence.",
          class: "Elementary Chinese",
        },
        {
          badge: "intermediate",
          char: "加油",
          title: "Intermediate — Level Up!",
          text: "Great foundation! Intermediate Chinese (HSK 4) or our Conversational class will push you toward fluency.",
          class: "Intermediate Chinese",
        },
      ],
      resultLabel: "Your suggested level",
      recommendedClass: "Recommended class",
      registerCta: "Register for this Class",
      retry: "Try Again",
      // 🧪 تسک ۸۲ — ذخیرهٔ نتیجه در دیتابیس + کپچر ایمیل (سرنخ)
      scoreLabel: "Your score",
      saveTitle: "Want a free personal study plan?",
      saveText: "Leave your email — our teachers will send you a study plan based on your result and happily answer your questions.",
      emailPlaceholder: "you@example.com",
      saveCta: "Send Me My Plan",
      saveSuccess: "Saved! Your result is with our team — we will reach out soon.",
      saveError: "Couldn't save your email — please try again.",
      saveInvalid: "Please enter a valid email address.",
      saveSending: "Sending…",
      saveFailedNote: "Your result could not be saved — no worries, everything else still works.",
    },
  },

  // ---------------------------------------------------------------
  //  ℹ️ صفحهٔ درباره ما
  // ---------------------------------------------------------------
  about: {
    eyebrow: "About Us",
    titleTop: "What is",
    titleHighlight: "Chinese Toon",
    titleBottom: "?",
    intro1:
      "Chinese Toon is a Mandarin Chinese language learning brand that creates engaging animated educational content on social media and provides practical, teacher-led language classes.",
    intro2:
      "We believe that learning Chinese should be structured and professional, but also enjoyable and creative. Our animated content makes Chinese more memorable, while our classes ensure you make real progress.",
    philosophy: {
      title: "Our Philosophy",
      p1: "Chinese can be learned in a way that is structured but enjoyable. Too often, language learning is either rigid and boring, or fun but ineffective. Chinese Toon bridges this gap.",
      p2: "Our animated content captures your attention and makes vocabulary and expressions memorable. Our classes provide the structure, practice, and professional guidance you need to actually improve.",
      animationBox: {
        title: "The Role of Animation",
        text: "Animation and creative content are used to make Chinese more engaging and memorable. They are the starting point — but real learning happens in structured, teacher-led classes where you practice, ask questions, and build skills step by step.",
      },
    },
    whyChinese: {
      title: "Why Chinese?",
      p1: "Mandarin Chinese is spoken by over 1 billion people worldwide. It opens doors to career opportunities, cultural understanding, travel, and meaningful connections.",
      items: [
        {
          icon: "briefcase",
          color: "sage",
          title: "Career Opportunities",
          text: "Chinese language skills are increasingly valued in global business and international relations.",
        },
        {
          icon: "heart",
          color: "butter",
          title: "Cultural Richness",
          text: "Understanding Chinese opens up thousands of years of history, literature, and culture.",
        },
        {
          icon: "map-pin",
          color: "peach",
          title: "Travel & Connection",
          text: "Speak Chinese when traveling and connect with people in their own language.",
        },
      ],
    },
    approach: {
      title: "Our Teaching Approach",
      subtitle:
        "Every class is designed to help you make real progress in Chinese.",
      items: [
        {
          icon: "list-checks",
          color: "sage",
          title: "Structured Learning",
          text: "Follow a clear curriculum from beginner to advanced with organized lessons and measurable goals.",
        },
        {
          icon: "message-circle",
          color: "butter",
          title: "Practical Communication",
          text: "Focus on speaking, listening, and real-life communication — not just textbooks and theory.",
        },
        {
          icon: "presentation",
          color: "peach",
          title: "Teacher-Led Instruction",
          text: "Learn from experienced teachers who guide you, correct you, and keep you motivated.",
        },
        {
          icon: "trending-up",
          color: "sage",
          title: "Progressive Development",
          text: "Build skills step by step — each level prepares you for the next with clear progression.",
        },
        {
          icon: "smile",
          color: "butter",
          title: "Supportive Environment",
          text: "Make mistakes, ask questions, and learn at your own pace in a friendly atmosphere.",
        },
        {
          icon: "sparkles",
          color: "peach",
          title: "Creative Content",
          text: "Animated lessons and engaging materials make vocabulary and grammar more memorable.",
        },
      ],
    },
    // -------------------------------------------------------------
    // 👩‍🏫 تیم معلم‌ها (بخش جدید!) — معلم اضافه/کم کنید:
    //    برای هر معلم یک بلوک { ... } داخل items کپی کنید.
    //    image: فایل عکس را در پوشهٔ public/images/team/ بگذارید
    //           و همین مسیر را بنویسید (یا خالی بگذارید → آیکون).
    //    tag: برچسب کوچک روی کارت (تخصص یا سطح تدریس)
    //    langs: زبان‌هایی که با آن‌ها درس می‌دهد (نمایش زیر بیو)
    // -------------------------------------------------------------
    teachers: {
      title: "Meet Our Teachers",
      subtitle:
        "Friendly, experienced, and passionate about helping you speak Chinese with confidence.",
      // 🆕 دکمهٔ کارت هر معلم → باز شدن مودال «رزومه و نمونهٔ تدریس»
      cardCta: "Resume & Teaching Samples",
      modal: {
        badge: "Teacher Profile",
        experience: "Years of experience",
        students: "Students taught",
        resumeTitle: "Résumé",
        resumeEmpty:
          "The full résumé will be published soon — feel free to ask anything via the Support page.",
        certsTitle: "Certificates & Qualifications",
        samplesTitle: "Teaching Samples",
        samplesEmpty: "Teaching samples are coming soon.",
        watchVideo: "Watch the sample lesson",
        listenAudio: "Listen to the audio sample",
        dialogNote: "Pronunciation demo — tap the speaker to hear each line.",
        registerCta: "Book a class",
        registerNote: "Want to learn with this teacher? Save your spot now.",
        close: "Close",
      },
      items: [
        {
          name: "Lin Xiaoyu",
          role: "Beginner & Conversation Teacher",
          bio: "Specializes in first steps — pinyin, tones, and everyday phrases. Her classes are full of games and short dialogues so beginners start speaking from day one.",
          tag: "Beginners",
          langs: ["Chinese", "English"],
          image: "/images/team/teacher-lin.png",
          resume:
            "Native Mandarin speaker from Beijing with a BA in Teaching Chinese as a Foreign Language from Beijing Language and Culture University (BLCU).\nSix years of classroom and online teaching with learners from 20+ countries — from absolute beginners to HSK 4.\nCertified international Chinese teacher (CTCSOL) and trained HSKK speaking examiner.\nHer lessons are famous for tone-drill games, role-play cafés, and «speak from minute one» sessions.",
          experienceYears: 6,
          studentsTaught: 800,
          certificates:
            "CTCSOL — International Chinese Teacher Certificate\nHSK 6 (Full Mark)\nHSKK Advanced Speaking Certificate\nBLCU — BA in Teaching Chinese as a Foreign Language",
          samples: [
            {
              kind: "dialog",
              title: "First-day greetings demo",
              desc:
                "你好 | nǐ hǎo | Hello\n你叫什么名字？ | nǐ jiào shénme míngzi? | What's your name?\n我叫小雨。 | wǒ jiào Xiǎoyǔ. | My name is Xiaoyu.\n很高兴认识你！ | hěn gāoxìng rènshi nǐ! | Nice to meet you!",
            },
            {
              kind: "text",
              title: "Tone-bootcamp mini drill",
              desc:
                "A 5-minute drill where learners clap the four tones: mā má mǎ mà. By the end, students can hear and repeat the difference between «mother» and «horse» without thinking.",
            },
          ],
        },
        {
          name: "Wei Chen",
          role: "Grammar & Writing Teacher",
          bio: "Explains Chinese grammar with clear, simple patterns. If you have ever felt confused by sentence structure, his whiteboard will make everything click.",
          tag: "Grammar",
          langs: ["Chinese", "English"],
          image: "/images/team/teacher-wei.png",
          resume:
            "Graduate of Fudan University (Shanghai) with an MA in Applied Linguistics.\nEight years of teaching Chinese grammar and writing — five of them online with Persian and English-speaking students.\nAuthor of the «Pattern of the Day» series used across Chinese Toon courses.\nBelieves every grammar rule fits on one whiteboard — if it doesn't, it needs a better explanation.",
          experienceYears: 8,
          studentsTaught: 1200,
          certificates:
            "Fudan University — MA in Applied Linguistics\nPutonghua Proficiency Test (PSC) Level 1-B\nCTCSOL — International Chinese Teacher Certificate",
          samples: [
            {
              kind: "dialog",
              title: "Pattern: 是…的 structure demo",
              desc:
                "我是昨天来的。 | wǒ shì zuótiān lái de. | I came yesterday.\n他是坐火车去的。 | tā shì zuò huǒchē qù de. | He went by train.\n我们是网上认识的。 | wǒmen shì wǎngshàng rènshi de. | We met online.",
            },
            {
              kind: "text",
              title: "Sentence-builder workshop sample",
              desc:
                "Students start with three words (我 / 昨天 / 来) and build a full sentence in four steps. The workshop ends with each student writing one true sentence about their own day — grammar that sticks because it's personal.",
            },
          ],
        },
        {
          name: "Mei Zhang",
          role: "Culture & Intermediate Teacher",
          bio: "Teaches through stories, tea culture, and festivals. With Mei, intermediate learners move beyond textbook Chinese into real cultural fluency.",
          tag: "Culture",
          langs: ["Chinese", "English"],
          image: "/images/team/teacher-mei.png",
          resume:
            "Nanjing-born teacher with a BA in Chinese Literature and a TESOL-style teaching certificate for Mandarin.\nSeven years of teaching intermediate conversation and culture — from calligraphy workshops to Spring Festival storytelling nights.\nRuns the popular «Tea & Talk» conversation club where every lesson is built around one Chinese tradition.\nSpecialist in idiom stories (成语) and real-life conversation beyond the textbook.",
          experienceYears: 7,
          studentsTaught: 950,
          certificates:
            "BA in Chinese Literature — Nanjing University\nPutonghua Proficiency Test (PSC) Level 1-A\nCertified Cultural Workshop Instructor",
          samples: [
            {
              kind: "text",
              title: "Tea & Talk — lesson snapshot",
              desc:
                "Lesson theme: 茶馆 (the teahouse). Students learn eight words, one proverb (人走茶凉), and finish by role-ordering tea like a local — in Chinese, of course.",
            },
            {
              kind: "dialog",
              title: "Story idiom demo: 画蛇添足",
              desc:
                "画蛇添足 | huà shé tiān zú | drawing a snake and adding feet\n意思是多此一举。 | yìsi shì duō cǐ yī jǔ. | It means doing something unnecessary.\n你别画蛇添足了！ | nǐ bié huà shé tiān zú le! | Don't overdo it!",
            },
          ],
        },
        {
          name: "Ana Rahimi",
          role: "HSK Prep & Vocabulary Teacher",
          bio: "Our HSK coach. Ana turns vocabulary lists into flashcard challenges and practice tests — her students walk into the exam feeling ready.",
          tag: "HSK Prep",
          langs: ["Chinese", "English", "Farsi"],
          image: "/images/team/teacher-ana.png",
          resume:
            "Iranian-Chinese tutor who passed HSK 6 herself before becoming a teacher — she knows the exam from both sides of the desk.\nFive years of HSK 1–4 preparation coaching with a 95% pass rate among her regular students.\nFluent in Farsi, English and Mandarin — perfect for Persian speakers who want everything explained without confusion.\nCreator of the Chinese Toon flashcard challenges and mock-test marathons.",
          experienceYears: 5,
          studentsTaught: 600,
          certificates:
            "HSK 6 Certificate (exam from both sides of the desk!)\nCTCSOL — International Chinese Teacher Certificate\nBA in Translation (Chinese–English–Farsi)",
          samples: [
            {
              kind: "dialog",
              title: "HSK 1 vocab rapid-fire",
              desc:
                "谢谢 | xièxie | Thank you\n不客气 | bú kèqi | You're welcome\n对不起 | duìbuqǐ | Sorry\n没关系 | méi guānxi | It's okay\n再见 | zàijiàn | Goodbye",
            },
            {
              kind: "text",
              title: "Mock-test marathon sample",
              desc:
                "A 40-minute session: 10 listening questions, 15 vocabulary cards, one mini writing task. Students get a personal error-map at the end showing exactly which sections to drill before exam day.",
            },
          ],
        },
      ],
    },
    // -------------------------------------------------------------
    // 📸 گالری «لحظه‌های کلاس» — ❌ حذف شد (به درخواست مالک سایت)
    //    اگر روزی خواستید برگردد، کامنت‌های git تاریخچه را نگه می‌دارند.
    // -------------------------------------------------------------
    getInTouch: {
      title: "Get in Touch",
      subtitle: "Have questions? We'd love to hear from you.",
    },
  },

  // ---------------------------------------------------------------
  //  🛟 صفحهٔ پشتیبانی (جدید!) — شامل سؤالات متداول و فرم تماس
  // ---------------------------------------------------------------
  support: {
    eyebrow: "Support Center",
    title: "How Can We Help You?",
    subtitle:
      "Answers to common questions, quick contact options, and a direct line to our team — we're here for you.",
    // کارت‌های تماس سریع
    quickContact: {
      title: "Quick Contact",
      subtitle: "Choose the channel you prefer — we speak English and Chinese.",
      channels: [
        {
          icon: "mail",
          color: "sage",
          title: "Email Us",
          value: "chinese.toon.org@gmail.com", // ایمیل واقعی برند
          note: "Best for detailed questions",
          link: "mailto:chinese.toon.org@gmail.com",
        },
        {
          icon: "send",
          color: "butter",
          title: "Telegram",
          value: "@Chinese_toon_support",
          note: "Fastest response",
          link: "https://t.me/Chinese_toon_support",
        },
        {
          icon: "instagram",
          color: "peach",
          title: "Instagram DM",
          value: "@chinese_toon",
          note: "Casual questions & updates",
          link: "https://www.instagram.com/chinese_toon?stkn=ZXUzOGtzeDZuYWM3",
        },
      ],
    },
    // ⭐ سؤالات متداول — برای افزودن سؤال جدید یک بلوک کپی کنید
    // «category» باید یکی از کلیدهای faqCategories باشد
    faq: {
      eyebrow: "FAQ",
      title: "Frequently Asked Questions",
      subtitle:
        "Can't find your answer? Send us a message below and we'll get back to you shortly.",
      searchPlaceholder: "Search questions... (e.g. trial, price, HSK)",
      categories: [
        { key: "all", label: "All" },
        { key: "general", label: "General" },
        { key: "classes", label: "Classes & Levels" },
        { key: "payment", label: "Payment & Pricing" },
        { key: "technical", label: "Technical" },
      ],
      items: [
        {
          category: "general",
          question: "What is Chinese Toon?",
          answer:
            "Chinese Toon is a Mandarin Chinese learning brand. We create engaging animated educational content on social media and offer practical, teacher-led classes for all levels — from complete beginner to advanced.",
        },
        {
          category: "general",
          question: "Do I need any prior experience to join?",
          answer:
            "Not at all! Our Beginner Chinese class starts from zero — no prior knowledge of Chinese is required. If you already know some Chinese, we'll help you find the right level with a quick placement chat.",
        },
        {
          category: "general",
          question: "What age groups do you teach?",
          answer:
            "Our classes are designed for teens and adults (13+). Younger learners are welcome in our private lessons with parent approval. If you're unsure, contact us and we'll recommend the best fit.",
        },
        {
          category: "classes",
          question: "How do I know which class level is right for me?",
          answer:
            "When you register, tell us about your current level and goals. We'll review your information and recommend the best class. If you're between levels, we can arrange a short free level assessment.",
        },
        {
          category: "classes",
          question: "What is HSK and do I need to take it?",
          answer:
            "HSK (Hanyu Shuiping Kaoshi) is the official Chinese proficiency exam. You don't need it to join our classes, but we offer dedicated HSK Preparation if you want an internationally recognized certificate for study or work.",
        },
        {
          category: "classes",
          question: "How big are the group classes?",
          answer:
            "We keep groups small — usually 4 to 8 students — so every learner gets plenty of speaking practice and personal attention from the teacher.",
        },
        {
          category: "classes",
          question: "Are classes online or in person?",
          answer:
            "All our current classes are held online via video call, so you can join from anywhere in the world. Recordings and materials are shared after each session.",
        },
        {
          category: "payment",
          question: "How much do classes cost?",
          answer:
            "Pricing depends on the class type (group or private) and length. Since schedules are being finalized, the best way to get the current price list is to register your interest or message us — we'll send you all the details.",
        },
        {
          category: "payment",
          question: "Can I try a class before paying?",
          answer:
            "Yes! We offer a free trial session for new students so you can experience our teaching style before committing. Just mention 'trial class' when you contact us.",
        },
        {
          category: "payment",
          question: "What is your refund policy?",
          answer:
            "If you're not satisfied after the first two sessions of a course, contact us and we'll refund the remaining sessions. Private lessons can be rescheduled free of charge up to 12 hours before the session.",
        },
        {
          category: "technical",
          question: "What do I need for online classes?",
          answer:
            "Just a stable internet connection, a device with a camera and microphone, and Zoom or Google Meet (free). We'll send you a joining link and any materials before each class.",
        },
        {
          category: "technical",
          question:
            "I submitted a form but haven't heard back. What should I do?",
          answer:
            "Please check your spam/junk folder first. If our reply isn't there, message us on Telegram or Instagram — social messages are usually answered faster.",
        },
      ],
      emptyResult: "No matching questions found. Try another keyword or send us a message.",
      // ℹ️ فاز ۵۸ — ویجت رأی Like/Dislike به درخواست مالک از FAQ حذف شد؛
      // متن‌های helpful* و API /api/faq/vote و جدول FaqVote نیز پاک شدند.
    },
    // فرم تماس پشتیبانی
    form: {
      eyebrow: "Contact Us",
      title: "Still Need Help? Send Us a Message",
      subtitle: "Fill in the form below and our team will reply to you by email.",
      name: "Full Name",
      namePlaceholder: "Your name",
      email: "Email",
      emailPlaceholder: "your@email.com",
      topic: "Topic",
      topics: [
        { key: "general", label: "General Question" },
        { key: "classes", label: "Classes & Registration" },
        { key: "payment", label: "Payment & Pricing" },
        { key: "technical", label: "Technical Issue" },
        { key: "other", label: "Other" },
      ],
      message: "Message",
      messagePlaceholder: "Describe your question or issue in detail...",
      submit: "Send Message",
      submitting: "Sending...",
      successTitle: "Message Sent!",
      successText:
        "Thanks for reaching out. We'll reply to your email within 24 hours on business days.",
      againButton: "Send Another Message",
      errorText:
        "Something went wrong. Please try again or contact us on social media.",
    },
  },

  // ---------------------------------------------------------------
  //  ✍️ صفحهٔ ثبت‌نام
  // ---------------------------------------------------------------
  register: {
    eyebrow: "Get Started",
    title: "Start Your Chinese Journey",
    subtitle:
      "Tell us a little about yourself and we'll help you find the right class.",
    name: "Full Name",
    namePlaceholder: "Your name",
    email: "Email",
    emailPlaceholder: "your@email.com",
    phone: "Phone",
    phonePlaceholder: "+1 234 567 8900",
    level: "Current Chinese Level *",
    levelPlaceholder: "Select your level",
    levels: [
      { key: "complete-beginner", label: "Complete Beginner" },
      { key: "beginner", label: "Beginner (some basics)" },
      { key: "elementary", label: "Elementary (HSK 2-3)" },
      { key: "intermediate", label: "Intermediate (HSK 4)" },
      { key: "advanced", label: "Advanced (HSK 5+)" },
      { key: "not-sure", label: "Not Sure" },
    ],
    classType: "Preferred Class Type",
    // 🔒 وقتی کلاس خاصی انتخاب شده باشد، نوع کلاس از تنظیمات همان کلاس خوانده می‌شود
    // و کاربر نمی‌تواند آن را عوض کند (مثلاً گروهی را خصوصی نکند)
    classTypeFromCourse: "Class Type",
    classTypeLockedNote: "Set automatically by your selected class",
    classTypes: [
      { key: "group", label: "Group Class" },
      { key: "private", label: "Private Class" },
      { key: "both", label: "Either" },
    ],
    schedule: "Preferred Schedule",
    schedulePlaceholder: "e.g., Weekday evenings, Weekend mornings",
    // 🗓️ ترجیحات ساخت‌یافتهٔ برنامه (فاز ۴۷) — منطقهٔ زمانی اول، بعد روز، بعد ساعت
    scheduling: {
      scheduleLabel: "Class scheduling preferences",
      stepTimezone: "1 · Your time zone",
      stepTimezoneHint: "Pick your own time zone first — every time you choose below is in YOUR local time.",
      chooseTz: "Select your time zone…",
      stepDays: "2 · Preferred days",
      stepDaysHint: "Pick up to three days per week.",
      stepTimes: "3 · Preferred time ranges",
      stepTimesHint: "Up to two ranges, in your own time zone. A range ending at or before its start continues past midnight (next day).",
      stepDaysPerWeek: "4 · Days per week",
      addRange: "Add another time range",
      removeRange: "Remove",
      endTimeNextDay: "(next day)",
      yourTimesIn: "Your selected times are based on {tz} local time.",
      notice: "These are your preferred days and times — not a confirmed schedule. The final class schedule will be determined by Chinese Toon based on availability and scheduling.",
      ack: "I understand that these are my preferred schedule options and that the final class schedule will be determined by Chinese Toon.",
    },
    goal: "Learning Goal",
    goalPlaceholder: "Why do you want to learn Chinese? Any specific goals?",
    message: "Additional Message",
    messagePlaceholder: "Anything else you'd like us to know?",
    submit: "Submit Registration",
    // 🏷️ کلاس انتخاب‌شده — وقتی کاربر از دکمهٔ Register صفحهٔ کلاس‌ها یا نتیجهٔ آزمون می‌آید،
    // کلاس به‌طور خودکار اینجا نمایش داده می‌شود (با دکمهٔ ✕ قابل حذف است)
    selectedClassLabel: "Selected class",
    selectedClassRemove: "Remove selected class",
    // 🎯 پیش‌نمایش قیمت زنده برای «نوع کلاس + سطح» — قیمت همیشه از API کاتالوگ
    //    سرور می‌آید (همان منبعی که سفارش واقعی از آن مبلغ را می‌خواند)؛
    //    هیچ قیمتی در کامپوننت هاردکد نشده و ترکیب ناموجود قیمت قلابی ندارد.
    priceBoxLabel: "Exact price for your selection",
    priceBoxHint: "Fixed package price — the exact amount to send is confirmed on the secure payment page.",
    priceBoxLoading: "Checking the current price...",
    priceBoxChooseType: "Choose Group Class or Private Class to see the exact price for your level.",
    priceBoxUnavailable: "This class combination is currently unavailable.",
    priceBoxUnavailableNote: "You can still submit your registration — we'll contact you with the available options.",
    priceBoxClassUnavailable: "This class is not open for online payment yet — submit your registration and we'll contact you with the details.",
    // 📝 فاز ۶۰ (بند ۲۲) — صادقانه: ثبت‌نام ذخیره شد، پرداخت هنوز در جریان است
    successTitle: "Registration details saved successfully!",
    successText1: "Your registration information has been saved.",
    successText2: "We'll contact you soon with the next steps.",
    successPayNote: "Review your order and continue to payment.",
    againButton: "Submit Another Registration",
  },

  // ---------------------------------------------------------------
  //  👤 صفحهٔ حساب کاربری (#/account) — ثبت‌نام/ورود مشتریان (فاز ۳۰)
  //  ثبت‌نام ≠ پرداخت: کاربر بدون خرید هم حساب معتبری دارد.
  //  ---------------------------------------------------------------
  account: {
    eyebrow: "Your Account",
    // 🎟️ تب‌ها
    tabRegister: "Create Account",
    tabLogin: "Sign In",
    // 📝 فرم ثبت‌نام
    regTitle: "Join Chinese Toon",
    regSubtitle: "Create your account to enroll in classes and pay securely by bank card.",
    firstName: "First Name",
    firstNamePlaceholder: "e.g. John",
    lastName: "Last Name",
    lastNamePlaceholder: "e.g. Miller",
    email: "Email",
    emailPlaceholder: "your@email.com",
    password: "Password",
    passwordPlaceholder: "At least 8 characters",
    confirmPassword: "Confirm Password",
    confirmPasswordPlaceholder: "Repeat your password",
    telegram: "Telegram ID / Username",
    telegramPlaceholder: "@username",
    telegramHint: "Optional — with or without @. Used to contact you about your classes.",
    country: "Country",
    countryPlaceholder: "Select your country",
    countrySearch: "Type to search countries…",
    phone: "Phone Number",
    phonePlaceholder: "+49 170 1234567",
    phoneHint: "Optional — with country code, e.g. +49 …",
    // 🎂 تاریخ تولد — اجباری در ثبت‌نام حساب (به‌جای فرم Register کلاس)
    dob: "Date of Birth",
    createAccount: "Create Account",
    creatingAccount: "Creating your account…",
    haveAccount: "Already have an account?",
    haveAccountLink: "Sign in",
    // 🔑 فرم ورود
    loginTitle: "Welcome Back",
    loginSubtitle: "Sign in to continue your classes and check your payments.",
    signIn: "Sign In",
    signingIn: "Signing in…",
    noAccount: "New to Chinese Toon?",
    noAccountLink: "Create an account",
    forgotHint: "Use the email you registered with. Contact support if you forget your password.",
    // 🔁 نشان‌دهندهٔ گذرواژه + Remember me (فاز ۴۰)
    showPassword: "Show password",
    hidePassword: "Hide password",
    rememberMe: "Remember me for 30 days",
    passwordHint: "At least 8 characters.",
    forgotPasswordLink: "Forgot password?",
    // 🔁 فراموشی رمز عبور (#/forgot-password)
    forgotTitle: "Reset Your Password",
    forgotSubtitle: "Enter the email you registered with and we'll send you a secure one-time reset link.",
    forgotSubmit: "Send Reset Link",
    forgotSending: "Sending…",
    forgotSuccess:
      "If an account exists for this email, a password reset link has been sent. Please check your inbox (and spam folder). The link expires in 60 minutes and can be used once.",
    forgotBackToLogin: "Back to Sign In",
    // 🔁 تعیین رمز جدید (#/reset-password?token=…)
    resetTitle: "Choose a New Password",
    resetSubtitle: "Create a new password for your Chinese Toon account.",
    newPassword: "New Password",
    newPasswordPlaceholder: "At least 8 characters",
    confirmNewPassword: "Confirm New Password",
    resetSubmit: "Change Password",
    resetSending: "Updating…",
    resetSuccessTitle: "Password Changed 🎉",
    resetSuccessText: "Your password has been updated. Sign in with your new password to continue — all previous sessions were signed out for your security.",
    resetGoToLogin: "Go to Sign In",
    resetInvalidTitle: "Link Invalid or Expired",
    resetInvalidText:
      "This password reset link is invalid, already used, or has expired (links last 60 minutes). Please request a fresh one — it only takes a moment.",
    resetRequestNew: "Request a New Link",
    // 👋 نمای پروفایل
    profileTitle: "My Account",
    memberSince: "Member since",
    lastLogin: "Last sign-in",
    // 🆔 فاز ۶۰ — کد یکتای پایدار دانش‌پذیر
    uniqueCode: "Your unique code",
    uniqueCodeNote: "This code permanently identifies your student record — quote it whenever you contact us.",
    uniqueCodeCopied: "Code copied!",
    copyCode: "Copy",
    logout: "Sign Out",
    myOrdersTitle: "My Classes & Payments",
    ordersEmpty: "You haven't purchased a class yet.",
    ordersEmptyCta: "Browse Classes",

    // 🗓️ برنامهٔ جلسات من (فاز ۴۸)
    myScheduleTitle: "My Class Schedule",
    scheduleEmpty: "No class sessions scheduled yet. After you register, the school will propose a schedule here for you to confirm.",
    scheduleTehranLine: "Tehran time:",
    scheduleDuration: "Duration",
    scheduleYourTz: "Your time zone",
    scheduleUpcoming: "Upcoming sessions",
    scheduleHistory: "Past & updated",
    confirmAction: "Confirm this time",
    cancelAction: "Cancel",
    confirmOk: "Schedule confirmed — see you in class!",
    cancelOk: "Session cancelled.",
    alertsTitle: "Schedule alerts",
    alertsEmpty: "No schedule updates yet.",
    markAllRead: "Mark all as read",
    minutes: "{n} min",
    cancelledByYou: "Cancelled by you",
    cancelledBySchool: "Cancelled by the school",
    orderViewPayment: "View payment",
    orderPaidOn: "Paid",
    // 🔔 اعلان‌های درون‌حسابی — حساب/سفارش/پرداخت (فاز ۵۲)
    notifTitle: "Notifications",
    notifSubtitle: "Important updates about your account, orders and payments — created by the system itself.",
    notifEmpty: "No notifications yet — order and account updates will appear here.",
    notifMarkAll: "Mark all as read",
    notifNew: "new",
    notifCatSchedule: "Schedule",
    notifCatOrder: "Order",
    notifCatPayment: "Payment",
    notifCatAccount: "Account",
    // 🎓 وضعیت ثبت‌نام هر کلاس — جدا از وضعیت پرداخت (مشتق سمت سرور)
    enrollLabel: "Status",
    enrollOrdered: "Order placed — waiting for payment",
    enrollPaid: "Paid — waiting for scheduling",
    enrollPrefs: "Paid — schedule preferences received",
    enrollProposed: "Schedule proposed — please confirm",
    enrollEnrolled: "Enrolled — you're all set!",
    enrollCompleted: "Course completed",
    nextSessionLabel: "Next session",
    paymentDetectedNote: "Payment submitted — waiting for verification…",
    welcomeToast: "Welcome to Chinese Toon! 🎉",
    welcomeBackToast: "Welcome back!",
    signedOutToast: "You have been signed out.",
    // 🔒 درگاه پرداخت — خرید فقط با حساب کاربری
    gateTitle: "Sign in to continue",
    gateText: "To create a payment order you need a Chinese Toon account. It takes less than a minute — and your order will be linked to your profile for easy follow-up.",
    gateRegister: "Create Account",
    gateLogin: "Sign In",
  },

  // ---------------------------------------------------------------
  //  📊 نوار آمار (در صفحهٔ خانه، زیر Hero) — عددها هنگام اسکرول شمرده می‌شوند
  // ---------------------------------------------------------------
  stats: {
    items: [
      { value: 1200, suffix: "+", label: "Happy Learners" },
      { value: 6, suffix: "", label: "Course Levels" },
      { value: 300, suffix: "+", label: "Video Lessons" },
      { value: 98, suffix: "%", label: "Satisfaction Rate" },
    ],
  },

  // ---------------------------------------------------------------
  //  ⭐ صفحهٔ اختصاصی نظرات (#/reviews) — بازدیدکننده اینجا نظر می‌دهد
  //  و همهٔ نظرات (دانشجویان + community) در همین صفحه نمایش داده می‌شود.
  //  بخش نظرات از صفحهٔ خانه به این صفحهٔ جدید منتقل شد.
  // ---------------------------------------------------------------
  reviewsPage: {
    // 🦸 هیرو بالای صفحه
    badge: "Student Voices",
    titleTop: "Share Your",
    titleHighlight: "Experience",
    subtitle:
      "Learning with Chinese Toon? Tell us about your journey — and read what other students say. Your words help future learners take their first step.",
    // 📊 خلاصهٔ امتیاز (بالای هیرو نشان داده می‌شود)
    ratingSummary: "Loved by students worldwide",
    // 🖱️ دکمهٔ اسکرول به فرم
    writeButton: "Write a Review",
    readButton: "Read Reviews",
  },

  // ---------------------------------------------------------------
  //  💬 نظرات دانشجویان (در صفحهٔ اختصاصی نظرات #/reviews)
  //  👇 برای افزودن نظر جدید یک بلوک کپی کنید
  // ---------------------------------------------------------------
  testimonials: {
    eyebrow: "Testimonials",
    title: "What Our Students Say",
    subtitle: "Real feedback from real learners on their Chinese journey.",
    items: [
      {
        name: "Sarah M.",
        role: "Beginner Chinese Student",
        initials: "SM",
        color: "sage",
        rating: 5,
        text: "The classes are amazing! I went from zero Chinese to holding basic conversations in just two months. The teacher makes every session fun and practical.",
      },
      {
        name: "James L.",
        role: "HSK 2 Student",
        initials: "JL",
        color: "butter",
        rating: 5,
        text: "I love how the animated content connects with the lessons. It makes vocabulary stick. The small group format means everyone gets to speak.",
      },
      {
        name: "Elena R.",
        role: "Conversation Class Student",
        initials: "ER",
        color: "peach",
        rating: 5,
        text: "The supportive environment helped me overcome my fear of speaking. Now I chat with my Chinese colleagues every day. Highly recommended!",
      },
      {
        name: "Marcus T.",
        role: "HSK 1 Student",
        initials: "MT",
        color: "sage",
        rating: 5,
        text: "I passed HSK 1 after three months! The flashcards and the tone trainer on the Learn page made practice feel like a game, not homework.",
      },
      {
        name: "Aisha K.",
        role: "Beginner Chinese Student",
        initials: "AK",
        color: "butter",
        rating: 4,
        text: "Lessons are short and clear — perfect after work. I love that every lesson comes with real words you can use the same day.",
      },
      {
        name: "Diego P.",
        role: "Elementary Chinese Student",
        initials: "DP",
        color: "peach",
        rating: 5,
        text: "Ordering food in Chinese used to be impossible for me. After the Food & Ordering lesson I ordered hotpot in Beijing with zero English!",
      },
      {
        name: "Emily W.",
        role: "HSK 3 Student",
        initials: "EW",
        color: "sage",
        rating: 5,
        text: "The teachers genuinely care about your progress. They remember your weak points and build the next lesson around them.",
      },
      {
        name: "Omar S.",
        role: "Conversation Class Student",
        initials: "OS",
        color: "butter",
        rating: 4,
        text: "Small classes mean you actually speak every session. My listening improved faster in two months than in a year of apps.",
      },
    ],
    // -------------------------------------------------------------
    //  ✍️ نظرات ثبت‌شدهٔ کاربران (در صفحهٔ نظرات #/reviews) — بازدیدکننده تجربه‌اش را می‌نویسد،
    //  نظر اول «در انتظار بررسی» می‌رود و فقط بعد از تأیید در پنل ادمین
    //  (تب Reviews) در همین بخش نمایش داده می‌شود.
    // -------------------------------------------------------------
    community: {
      eyebrow: "Community Reviews",
      // عنوان بخش — عنوان اصلی صفحه («Share Your Experience») در هیرو است،
      // پس اینجا عنوان متفاوتی است تا تکراری نشود
      title: "Join the Conversation",
      subtitle:
        "Learning with us? Write about your journey — your words help future students take their first step.",
      formTitle: "Write a Review",
      nameLabel: "Your name",
      namePlaceholder: "e.g. Sara A.",
      roleLabel: "Your class / level (optional)",
      rolePlaceholder: "e.g. HSK 1 Student",
      ratingLabel: "Your rating",
      textLabel: "Your review",
      textPlaceholder:
        "What did you learn? What did you enjoy? What surprised you about Chinese?",
      submit: "Submit Review",
      submitting: "Sending...",
      successTitle: "Thank you! 🎉",
      successNote:
        "Your review was received and will appear here after a quick check by our team.",
      submitAnother: "Write another",
      errorNote: "Something went wrong — please check the fields and try again.",
      approvedTitle: "From Our Students",
      empty:
        "No community reviews yet — be the first to share your experience!",
      pendingBadge: "Pending review", // برای پنل ادمین
      initialHint: "e.g. SA", // حرف‌های روی آواتار
      // ❤️ لایک نظرات (فاز ۴۶) — شمارنده از سرور می‌آید؛ کلیک = تاگل لایک/حذف لایک
      likeAria: "Like this review",
      unlikeAria: "Remove your like",
      likeFailed: "Your like wasn't saved — check your connection and try again.",
      loadFailed: "Couldn't load reviews — check your connection.",
      retry: "Retry",
    },
  },

  // ---------------------------------------------------------------
  //  📬 خبرنامه (فرم پایین فوتر)
  // ---------------------------------------------------------------
  newsletter: {
    title: "Subscribe to Our Newsletter",
    subtitle: "Get free Chinese tips and lesson updates in your inbox.",
    placeholder: "Your email address",
    button: "Subscribe",
    submitting: "...",
    successMessage: "You're subscribed! Welcome aboard! 🎉",
    errorMessage: "Subscription failed. Please try again in a moment.",
  },

  // ---------------------------------------------------------------
  //  🔐 پنل مدیریت (در منو نیست — با آدرس #/admin باز می‌شود)
  // ---------------------------------------------------------------
  admin: {
    title: "Admin Dashboard",
    subtitle: "Support messages and class registrations in one place.",
    backToSite: "← Back to Site",
    // 🔒 ورود به پنل (نام کاربری و رمز در فایل .env روی سرور تنظیم می‌شود)
    // لینک ادمین در فوتر حذف شده — ورود فقط با آدرس مستقیم #/admin
    login: {
      title: "Admin Login",
      subtitle: "This area is protected. Please sign in to continue.",
      usernameLabel: "Username",
      usernamePlaceholder: "admin",
      passwordLabel: "Password",
      passwordPlaceholder: "••••••••",
      submit: "Enter Dashboard",
      error: "Wrong username or password. Please try again.",
      hint: "Tip: username and password are set in the .env file (ADMIN_USERNAME / ADMIN_PASSWORD).",
    },
    logout: "Log out",
    tabMessages: "Support Messages",
    tabRegistrations: "Registrations",
    tabNewsletter: "Newsletter",
    // 👥 تب کاربران (فاز ۳۰) — ثبت‌نام‌شده‌ها با وضعیت خرید واقعی
    tabStudents: "Students",
    students: {
      subtitle: "Registered users and their real payment status — registration and payment are tracked separately.",
      searchPlaceholder: "Search name, email, Telegram, country or order ref…",
      filterAll: "All",
      filterNew: "New",
      filterNoPurchase: "No Purchase",
      filterUnpaid: "Unpaid",
      filterPaid: "Paid",
      filterUnderpaid: "Underpaid",
      filterExpired: "Expired",
      filterCancelled: "Cancelled",
      stNoPurchase: "Not Purchased",
      stUnpaid: "Unpaid",
      stPaid: "Paid",
      stUnderpaid: "Underpaid",
      stExpired: "Expired",
      stCancelled: "Cancelled",
      thUser: "User",
      thEmail: "Email",
      // 🆔 فاز ۶۰ — ستون کد یکتا در جدول Students
      thCode: "Code",
      thTelegram: "Telegram",
      thCountry: "Country",
      thOrders: "Orders",
      thStatus: "Payment",
      thRegistered: "Registered",
      newBadge: "NEW",
      empty: "No users match this view.",
      loadError: "Could not load users",
      // 🗂️ جزئیات کاربر
      detailTitle: "User Profile",
      dFirstName: "First name",
      dLastName: "Last name",
      dEmail: "Email",
      dTelegram: "Telegram username",
      dTelegramId: "Telegram ID (numeric)",
      dTelegramIdNone: "Not linked yet",
      // 🆔 فاز ۶۰ — کد یکتا + تاریخ تولد در جزئیات دانش‌پذیر
      dUniqueCode: "Unique code (student ID)",
      dDob: "Date of birth",
      dCountry: "Country",
      dPhone: "Phone",
      dNotProvided: "—",
      dRegistered: "Registered",
      dLastLogin: "Last sign-in",
      dNever: "Never",
      dPurchaseStatus: "Purchase status",
      dOrdersTitle: "Orders & Payments",
      dOrdersEmpty: "No orders — this user registered but has not purchased anything.",
      dLeadsTitle: "Class requests (registration form)",
      dLeadsEmpty: "No class requests from this email.",
      dOrderRef: "Ref",
      dOrderProduct: "Class",
      dOrderAmount: "Amount",
      dOrderStatus: "Status",
      dOrderCreated: "Created",
      dOrderExpires: "Expires",
      dOrderPaidOn: "Paid on",
      dOrderTx: "Transaction hash",
      dOrderFrom: "Paid from address",
      dOrderAddress: "Payment address",
      dLeadLevel: "Level",
      dLeadClass: "Requested class",
      dLeadType: "Type",
      dLeadStatus: "Status",
      // فاز ۶۰ (بند ۱۸) — همهٔ داده‌های واقعاً ذخیره‌شدهٔ فرم ثبت‌نام
      dLeadGoal: "Learning goal",
      dLeadMessage: "Additional message",
      dLeadSchedule: "Schedule preferences",
      dLeadArchived: "Archived",
      dLeadTimezone: "Time zone",
      close: "Close",
    },
    // 💳 تب Payments پنل ادمین — مدیریت پرداخت دستی کارت بانکی (فاز ۵۹)
    tabOrders: "Payments",
    ordersEmpty: "No orders yet.",
    cancelOrder: "Cancel",
    cancelConfirm: "Cancel this pending order? The customer's payment page will show it as cancelled.",
    orderCancelled: "Order cancelled",
    ordersEventsTitle: "Payment events",
    ordersEventsEmpty: "No payment events yet.",
    // 🎛️ تنظیمات پرداخت — کارت بانکی (فاز ۵۹)
    paySettingsTitle: "Bank Card Payment",
    paySettingsDesc:
      "Configure the bank card customers see on the payment page. Customers transfer the exact final amount to this card and upload a receipt — you review and approve or reject it in the list below. The card information is stored in the database and can be changed here at any time, no developer needed.",
    paySettingsEnable: "Enable Manual Card Payment",
    paySettingsCardNumber: "Card Number",
    paySettingsCardPlaceholder: "0000 0000 0000 0000",
    paySettingsCardHolder: "Card Holder",
    paySettingsCardHolderPlaceholder: "Card Holder Name",
    paySettingsBank: "Bank",
    paySettingsBankPlaceholder: "Bank Name",
    paySettingsInstructions: "Payment Instructions (optional)",
    paySettingsInstructionsPlaceholder: "e.g. Please transfer the exact final amount shown on your payment page.",
    paySettingsSave: "Save Payment Settings",
    paySettingsSaving: "Saving…",
    paySettingsSaved: "Payment settings saved",
    paySettingsError: "Could not save payment settings",
    paySettingsDisabledNote:
      "Manual card payment is currently DISABLED — customers cannot reach the payment page until you enable it and save a valid card number.",
    paySettingsEnabledNote: "Manual card payment is ENABLED — new orders pay to the card below.",
    paySettingsLastUpdated: "Last updated",
    paySettingsCurrent: "Currently shown to customers:",
    // 📋 مدیریت پرداخت‌ها (فاز ۵۹)
    payAdmin: {
      subtitle: "Review uploaded receipts, then approve or reject each payment manually.",
      summaryPendingReview: "Pending Payment Reviews",
      summaryApproved: "Approved Payments",
      summaryRejected: "Rejected Payments",
      summaryUnpaid: "Unpaid Orders",
      filterAll: "All",
      filterUnpaid: "Unpaid",
      filterReceipt: "Receipt Submitted",
      filterApproved: "Approved",
      filterRejected: "Rejected",
      filterCancelled: "Cancelled",
      filterExpired: "Expired",
      filterLegacy: "Legacy USDT",
      searchPlaceholder: "Search by order ID, customer, email or class…",
      colOrder: "Order",
      colCustomer: "Customer",
      colClass: "Class",
      colAmount: "Amount",
      colDiscount: "Discount",
      colFinal: "Final",
      colMethod: "Method",
      colStatus: "Status",
      colReceipt: "Receipt",
      colUpdated: "Updated",
      colAction: "Action",
      receiptNone: "—",
      review: "Review",
      empty: "No payments match the current filters.",
      prev: "Previous",
      next: "Next",
      pageOf: (p: number, t: number) => `Page ${p} of ${t}`,
      // جزئیات پرداخت
      detailTitle: "Payment details",
      blockCustomer: "Customer information",
      blockClass: "Class information",
      blockFinancial: "Financial information",
      blockPayment: "Payment information",
      blockReceipt: "Receipt",
      blockEvents: "Audit trail",
      cName: "Name",
      cEmail: "Email",
      cPhone: "Phone",
      cCountry: "Country",
      cMemberSince: "Member since",
      cTelegram: "Telegram",
      clLevel: "Level",
      clType: "Type",
      clFormat: "Format",
      clSchedule: "Schedule",
      clSessions: "Sessions",
      fOriginal: "Original price",
      fTier: "Package discount",
      fCode: "Discount code",
      fFinal: "Final amount",
      pMethod: "Payment method",
      pStatus: "Payment status",
      pSubmitted: "Receipt submitted",
      pReviewed: "Reviewed",
      pReviewedBy: "Reviewed by",
      pPaid: "Approved at",
      pResubmits: "Resubmissions",
      pFileName: "File",
      receiptView: "Open receipt image",
      receiptEmpty: "No receipt uploaded yet.",
      approve: "Approve Payment",
      reject: "Reject Payment",
      approveConfirmTitle: "Approve this payment?",
      approveConfirmText: (ref: string, amount: string) =>
        `Confirm that you have verified the receipt for order ${ref} (${amount} USD). The order will be marked as paid and the customer's enrollment will be confirmed.`,
      approveYes: "Yes, approve payment",
      rejectTitle: "Reject this receipt",
      rejectReasonLabel: "Rejection reason",
      rejectPresets: [
        "Receipt is unclear",
        "Amount does not match the order",
        "Receipt is invalid",
        "Payment could not be verified",
        "Wrong account/card",
        "Duplicate receipt",
      ],
      rejectCustom: "Or write a custom reason…",
      rejectSubmit: "Reject payment",
      approvedToast: "Payment approved",
      rejectedToast: "Payment rejected",
      rejectFailed: "Could not reject the payment",
      approveFailed: "Could not approve the payment",
      close: "Close",
      zoomHint: "Click the image to zoom",
      copy: "Copy",
      copied: "Copied",
      loading: "Loading…",
      loadFailed: "Could not load payment details.",
      legacyBadge: "Legacy USDT order",
      cancelAction: "Cancel order",
      eventsEmpty: "No audit events for this order yet.",
    },
    statusPaid: "Approved",
    statusPending: "Unpaid",
    statusExpired: "Expired",
    statusCancelled: "Cancelled",
    statusUnderpaid: "Underpaid",
    statusReceiptSubmitted: "Receipt Submitted",
    statusRejected: "Rejected",
    // 🧾 مدیریت سفارش‌ها (بند ۱–۵) — فهرست کامل + جزئیات زنجیرهٔ
    //    User → Order → Course → Payment → Enrollment/Schedule
    ordersM: {
      subtitle: "Every customer order with payment reconciliation and enrollment tracking.",
      searchPlaceholder: "Search by order ID, email or name…",
      filterAll: "All",
      // 🏷️ وضعیت پرداخت
      payUnpaid: "Unpaid",
      payDetected: "Payment detected",
      payConfirmed: "Payment confirmed",
      payUnderpaid: "Underpaid",
      payExpired: "Expired",
      payCancelled: "Cancelled",
      // 🎓 وضعیت ثبت‌نام
      enrollLabel: "Enrollment",
      enrollRegistered: "Registered",
      enrollOrdered: "Ordered",
      enrollPaid: "Paid",
      enrollPrefs: "Prefs submitted",
      enrollProposed: "Schedule proposed",
      enrollEnrolled: "Enrolled",
      enrollCompleted: "Completed",
      // ستون‌های جدول
      colOrder: "Order",
      colCustomer: "Customer",
      colCourse: "Course",
      colSessions: "Sessions",
      colBase: "Base",
      colDiscount: "Discount",
      colFinal: "Final",
      colMethod: "Method",
      colPayStatus: "Payment",
      colEnrollment: "Enrollment",
      colCreated: "Created",
      colUpdated: "Updated",
      guest: "Guest (legacy)",
      empty: "No orders match the current filters.",
      prev: "Previous",
      next: "Next",
      pageOf: (p: number, t: number) => `Page ${p} of ${t}`,
      // جزئیات سفارش
      detailTitle: "Order details",
      chainTitle: "Progress chain",
      chainAccount: "Account registered",
      chainOrder: "Order created",
      chainPaid: "Payment confirmed on-chain",
      chainPrefs: "Scheduling preferences submitted",
      chainProposed: "Schedule proposed by admin",
      chainEnrolled: "Enrolled — active student",
      chainCompleted: "Course completed",
      blockOrder: "Order",
      blockCustomer: "Customer",
      blockCourse: "Course",
      blockPayment: "Payment & reconciliation",
      blockSchedule: "Enrollment & schedule",
      blockEvents: "Payment verification events",
      orderRef: "Order ID",
      snapshotNote: "Amounts are the historical snapshot from order creation — later price or discount changes never alter them.",
      pricePerSession: "Price per session",
      tierDiscount: "Package tier discount",
      codeDiscount: "Discount code",
      discountNone: "—",
      finalAmount: "Final amount",
      method: "Payment method",
      network: "Network",
      address: "Receiving address",
      addressIndex: "HD index",
      txHash: "Transaction hash",
      txAmount: "Received amount",
      txFrom: "Sender",
      paidAt: "Confirmed at",
      ttl: "Expires at",
      accountCreated: "Account created",
      openClassPage: "Open class page",
      scheduleNone: "No sessions scheduled yet.",
      nextSession: "Next session",
      regNone: "No registration form submitted for this email.",
      regPrefs: "Scheduling preferences",
      regTimezone: "Timezone",
      regDays: "Preferred days",
      regTimes: "Preferred times",
      regPerWeek: "Days per week",
      eventsEmpty: "No verification events for this order yet.",
      cancelAction: "Cancel order",
      copy: "Copy",
      copied: "Copied",
      close: "Close",
      loading: "Loading…",
      loadFailed: "Could not load order details.",
      cancelled: "Order cancelled",
      explorer: "View on explorer",
    },
    newBadge: "NEW",
    emptyMessages: "No support messages yet.",
    emptyRegistrations: "No registrations yet.",
    emptyNewsletter: "No subscribers yet.",
    refresh: "Refresh",
    fromLabel: "From",
    emailLabel: "Email",
    topicLabel: "Topic",
    levelLabel: "Level",
    classTypeLabel: "Type",
    scheduleLabel: "Schedule",
    goalLabel: "Goal",
    messageLabel: "Message",
    subscribersCount: "subscribers",
    // 📊 کارت‌های آمار بالای داشبورد
    statsTitle: "Overview",
    statMessages: "Messages",
    statRegistrations: "Registrations",
    statSubscribers: "Subscribers",
    statPosts: "Blog Posts",
    // 💳 فاز ۵۹ — خلاصهٔ پرداخت‌های دستی روی داشبورد (کلیک = فیلتر تب Payments)
    statPendingReviews: "Pending Reviews",
    statApprovedPayments: "Approved Payments",
    statRejectedPayments: "Rejected Payments",
    statUnpaidOrders: "Unpaid Orders",
    // 📊 فاز ۶۰ (بند ۱۶ و ۱۷) — تفکیک شفاف: حساب‌های کاربری ≠ رکوردهای ثبت‌نام
    statStudentAccounts: "Student accounts",
    statRegistrationRequests: "Class registration requests",
    statRegistrationSub: "Counted regardless of payment status",
    needAttention: "need attention", // زیر‌متن آمار (موارد جدید)
    // 🔔 نوار اعلان موارد در انتظار بررسی (پیام/ثبت‌نام/نظر) — بالای داشبورد و بَج روی تب‌ها
    attentionBanner: "item(s) are waiting for your attention",
    attentionGo: "Review now",
    // 🔄 دکمه‌های تغییر وضعیت
    statusLabel: "Status",
    statusNew: "New",
    statusInProgress: "In Progress",
    statusResolved: "Resolved",
    statusContacted: "Contacted",
    statusEnrolled: "Enrolled",
    deleteButton: "Delete",
    deleteConfirm: "Delete this item? This cannot be undone.",
    // 📰 تب وبلاگ
    tabBlog: "Blog",
    newPostButton: "+ New Post",
    emptyPosts: "No posts yet — create your first article!",
    postTitleLabel: "Title",
    postTitlePlaceholder: "e.g. New HSK 2 Class Opening in Mehr",
    postTagLabel: "Category",
    postEmojiLabel: "Cover emoji",
    postColorLabel: "Cover color",
    postImageLabel: "Cover image (optional)",
    postImagePlaceholder: "/images/blog/my-photo.png or https://...",
    postImageHint: "Upload a file or paste a link. Leave empty for the brand gradient + emoji cover.",
    // 🖼️ آپلود تصویر از خود فرم (فایل از رایانه)
    postImageUpload: "Upload image",
    postImageUploading: "Uploading...",
    postImageUploadedToast: "Image uploaded ✓",
    postImageUploadError: "Upload failed — use a JPG/PNG/WebP/GIF up to 4MB.",
    postImageRemove: "Remove", // پاک کردن تصویر انتخاب‌شده
    // 📄 ساخت رونوشت از یک مقالهٔ موجود (تب Blog)
    duplicatePost: "Duplicate",
    duplicateSuffix: "(Copy)",
    // ✏️ ویرایش مقالهٔ موجود (همان فرم، این‌بار ذخیرهٔ تغییرات)
    editPost: "Edit",
    editPostDialogTitle: "Edit Post",
    saveChangesButton: "Save Changes",
    savingButton: "Saving...",
    postUpdatedToast: "Changes saved ✓",
    viewPost: "View article", // لینک باز کردن صفحهٔ مقاله در تب جدید
    // ⬇️ خروجی CSV از داده‌های پنل
    exportCsv: "Export CSV",
    exportCsvMessages: "support-messages",
    exportCsvRegistrations: "registrations",
    exportCsvNewsletter: "newsletter-subscribers",
    exportCsvReviews: "user-reviews",
    postViewsLabel: "views",
    postExcerptLabel: "Short summary",
    postExcerptPlaceholder: "One or two sentences shown on the card...",
    postContentLabel: "Article text",
    postContentPlaceholder:
      "Write the article here. Separate paragraphs with an empty line. Use **double stars** for bold.",
    publishToggleLabel: "Publish immediately",
    createPostButton: "Create Post",
    creatingButton: "Creating...",
    postCreatedToast: "Post created! 🎉",
    publishLabel: "Published",
    unpublishLabel: "Draft",
    confirmDeletePost: "Delete this post? This cannot be undone.",
    // 🔢 صفحه‌بندی لیست‌ها (پیام‌ها / ثبت‌نام‌ها / خبرنامه)
    //   perPage: چند آیتم در هر صفحه نشان داده شود
    prevPage: "Previous",
    nextPage: "Next",
    pageLabel: "Page", // مثل «Page 1 of 3»
    pageOf: "of",

    // -------------------------------------------------------------
    //  💬 تب نظرات کاربران (Reviews) — تأیید/رد نظرهای ثبت‌شده
    // -------------------------------------------------------------
    tabReviews: "Reviews",
    statReviews: "User Reviews",
    reviewApprove: "Approve",
    reviewReject: "Reject",
    reviewApproveToast: "Review approved ✓ — it is now visible on the site",
    reviewRejectedToast: "Review hidden from the site",
    reviewPending: "Pending",
    reviewApproved: "Approved",
    reviewRejected: "Rejected",
    emptyReviews: "No reviews yet — click \u201cImport default reviews\u201d to bring in the starter set, or wait for student submissions.",
    confirmDeleteReview: "Archive this review? You can restore it anytime from the archive below.",
    // 🗄️ بایگانی (حذف نرم) نظرات و سؤالات — بازگردانی بدون پاک‌شدن همیشگی (فاز ۵۵)
    archiveTitle: "Archive (soft-deleted)",
    archiveHint: "Archived items are hidden from the site but never destroyed — restore anytime.",
    archiveEmpty: "Nothing archived — deleted items appear here.",
    restoreButton: "Restore",
    restoreSuccessToast: "Restored ✓",
    archivedBadge: "Archived",
    reviewsAdminHint:
      "Star = featured review (the fixed ones on the home carousel & Reviews page). Edit or delete any review, import the starter set, or write one yourself.",
    // ⭐ نظرات منتخب (featured) — همان “نظرات ثابت” کاروسل خانه و صفحهٔ نظرات
    importTestimonialsButton: "\u2b07 Import default reviews",
    newReviewButton: "+ New review",
    editReviewDialogTitle: "Edit review",
    newReviewDialogTitle: "New review",
    featuredBadge: "Featured",
    featuredToggleTitle: "Show/Hide in the home carousel & testimonials",
    reviewFeaturedToast: "Review added to the featured set \u2b50",
    reviewUnfeaturedToast: "Review removed from the featured set",
    reviewSavedToast: "Review saved \u2705",
    reviewNameLabel: "Name *",
    reviewNamePlaceholder: "e.g. Sarah M.",
    reviewRoleLabel: "Role / class (optional)",
    reviewRolePlaceholder: "e.g. HSK 2 Student",
    reviewTextLabel: "Review text *",
    reviewTextPlaceholder: "What did they say? (min 10 characters)",
    reviewRatingLabel: "Stars",
    reviewStatusLabel: "Status",
    reviewFeaturedLabel: "Featured (show on home carousel)",
    seedTestimonialsDone: "Default reviews imported \U0001f389 \u2014 now you can edit or delete them here",
    seedTeachersDone: "Default teachers imported \U0001f389 \u2014 now you can edit or delete them here",
    importTeachersButton: "\u2b07 Import default teachers",

    // -------------------------------------------------------------
    //  🃏 تب واژه‌ها (Words) — فلش‌کارت‌های صفحهٔ Learn از اینجا مدیریت می‌شوند
    //  تا وقتی هیچ واژه‌ای نسازید، واژه‌های پیش‌فرض فایل محتوا نمایش داده می‌شوند
    // -------------------------------------------------------------
    tabWords: "Words",
    emptyWords: "No custom words yet — the Learn page shows the default set until you add your own.",
    newWordButton: "+ New Word",
    wordChineseLabel: "Chinese characters",
    wordChinesePlaceholder: "e.g. 你好",
    wordPinyinLabel: "Pinyin (with tones)",
    wordPinyinPlaceholder: "e.g. nǐ hǎo",
    wordMeaningLabel: "Meaning (English)",
    wordMeaningPlaceholder: "e.g. Hello",
    wordExampleLabel: "Example sentence (optional)",
    wordExamplePlaceholder: "e.g. Nǐ hǎo! Nice to meet you.",
    wordOrderLabel: "Display order",
    wordCreatedToast: "Word added! It now appears in the Learn flashcards 🎉",
    wordUpdatedToast: "Word updated ✓",
    wordDeletedToast: "Word deleted",
    confirmDeleteWord: "Delete this word from the flashcards?",
    editWordDialogTitle: "Edit Word",

    // -------------------------------------------------------------
    //  🧩 تب آزمون (Quiz) — سؤالات آزمون تعیین سطح صفحهٔ Learn
    //  هر سؤال ۲ تا ۶ گزینه دارد و هر گزینه یک امتیاز (۱=مبتدی … ۴=پیشرفته)
    // -------------------------------------------------------------
    tabQuiz: "Quiz",
    emptyQuiz: "No custom questions yet — the Learn page shows the default quiz until you add your own.",
    newQuizButton: "+ New Question",
    quizQuestionLabel: "Question",
    quizQuestionPlaceholder: "e.g. How comfortable are you with tones?",
    quizOptionsLabel: "Answer options (score 1 = beginner … 4 = advanced)",
    quizOptionTextPlaceholder: "Option text",
    quizAddOption: "+ Add option",
    quizRemoveOption: "Remove",
    quizCreatedToast: "Question added to the quiz 🎉",
    quizUpdatedToast: "Question updated ✓",
    quizDeletedToast: "Question deleted",
    confirmDeleteQuiz: "Delete this quiz question?",
    editQuizDialogTitle: "Edit Question",
    learnDbHint: "These items come from the database — the Learn page uses them as soon as at least one item is published here.",
    // 📥 درون‌ریزی واژه‌ها/سؤالات پیش‌فرض فایل محتوا به دیتابیس
    //   تا مالک بتواند همهٔ لغات و سؤالاتی را که در Learn دیده می‌شود از پنل مدیریت کند
    seedWordsButton: "⬇ Import default words",
    seedQuizButton: "⬇ Import default questions",
    seedWordsDone: "Default words imported into the panel 🎉 — now you can edit or delete them here",
    seedQuizDone: "Default questions imported into the panel 🎉 — now you can edit or delete them here",
    seedNothing: "Nothing to import — they are already in the panel.",
    seedError: "Import failed — please refresh and try again.",

    // -------------------------------------------------------------
    //  👩‍🏫 تب معلم‌ها (Teachers) — تیم معلم‌های صفحهٔ About از اینجا مدیریت می‌شود
    //  تا وقتی هیچ معلمی نسازید، تیم پیش‌فرض فایل محتوا نمایش داده می‌شود
    // -------------------------------------------------------------
    tabTeachers: "Teachers",
    emptyTeachers: "No teachers yet — the About page shows the default team until you add your own.",
    newTeacherButton: "+ New Teacher",
    teacherNameLabel: "Full name",
    teacherNamePlaceholder: "e.g. Lin Xiaoyu",
    teacherRoleLabel: "Role / title",
    teacherRolePlaceholder: "e.g. Beginner & Conversation Teacher",
    teacherBioLabel: "Short bio",
    teacherBioPlaceholder: "A couple of friendly sentences about this teacher…",
    teacherTagLabel: "Specialty tag",
    teacherTagPlaceholder: "e.g. Beginners",
    teacherLangsLabel: "Teaching languages (comma separated)",
    teacherLangsPlaceholder: "e.g. Chinese, English, Farsi",
    teacherImageLabel: "Photo (optional)",
    teacherImagePlaceholder: "/images/team/my-teacher.png or https://...",
    teacherImageHint: "Upload a file or paste a link. Leave empty for the brand gradient portrait.",
    teacherImageUpload: "Upload photo",
    // 🆕 رزومه و نمونه‌های تدریس — فرم معلم
    teacherResumeLabel: "Full résumé",
    teacherResumePlaceholder:
      "One paragraph per line: education, experience, teaching style… (shown in the profile modal)",
    teacherExpLabel: "Experience (years)",
    teacherStudentsLabel: "Students taught",
    teacherCertsLabel: "Certificates & qualifications",
    teacherCertsPlaceholder: "One certificate per line, e.g. CTCSOL — International Chinese Teacher Certificate",
    teacherSamplesLabel: "Teaching samples",
    teacherSamplesHint:
      "Showcased in the teacher's profile modal. Video/audio open as links; dialogue lines use the format: 汉字 | pinyin | meaning (one per line).",
    sampleKindLabel: "Type",
    sampleKindVideo: "Video link",
    sampleKindAudio: "Audio link",
    sampleKindText: "Teaching note",
    sampleKindDialog: "Dialogue demo",
    sampleTitleLabel: "Title",
    sampleTitlePlaceholder: "e.g. First-day greetings demo",
    sampleUrlLabel: "URL",
    sampleUrlPlaceholder: "https://… (required for video/audio)",
    sampleDescLabel: "Description / content",
    sampleDescPlaceholder: "Required for note & dialogue samples",
    addSampleButton: "+ Add sample",
    teacherCreatedToast: "Teacher added! It now appears on the About page 🎉",
    teacherUpdatedToast: "Teacher updated ✓",
    confirmDeleteTeacher: "Delete this teacher from the About page?",
    editTeacherDialogTitle: "Edit Teacher",
    teachersDbHint: "These teachers appear on the About page. Until you add your own here, the default team from the content file is shown.",

    // 📊 تب معلم‌ها در آمار
    statTeachers: "Teachers",

    // -------------------------------------------------------------
    //  📚 تب درس‌ها (Lessons) — کارت‌ها و محتوای بخش Learn از اینجا مدیریت می‌شود:
    //  افزودن/ویرایش/حذف درس + واژه‌های داخل هر درس (پنجرهٔ مودال درس)
    //  تا وقتی هیچ درسی نسازید، درس‌های پیش‌فرض فایل محتوا نمایش داده می‌شوند
    // -------------------------------------------------------------
    tabLessons: "Lessons",
    emptyLessons: "No lessons yet — the Learn page shows the default lessons until you add your own.",
    newLessonButton: "+ New Lesson",
    importLessonsButton: "⬇ Import default lessons",
    lessonsDbHint:
      "Full control over the Learn section: each lesson is a card AND the words inside it. Until you import or create lessons, the defaults from the content file are shown. Deleting all lessons brings the defaults back.",
    lessonLinkLabel: "Link key (slug) *",
    lessonLinkPlaceholder: "e.g. greetings — used in #/learn?lesson=greetings",
    lessonLinkHint: "Lowercase letters, numbers and dashes only. Home free-content cards link to ?lesson=<this key>.",
    lessonTitleLabel: "Title *",
    lessonTitlePlaceholder: "e.g. Basic Greetings",
    lessonCardTextLabel: "Card description",
    lessonCardTextPlaceholder: "One or two lines shown on the Learn card…",
    lessonSubtitleLabel: "Lesson intro (shown above the words)",
    lessonSubtitlePlaceholder: "e.g. Your very first Chinese words — say hello, thank you and goodbye.",
    lessonBigLabel: "Big character on card",
    lessonBigPlaceholder: "e.g. 你好 or 🧧 or HSK 1",
    lessonSmallLabel: "Small line under the big character",
    lessonSmallPlaceholder: "e.g. nǐ hǎo",
    lessonTagLabel: "Card tag",
    lessonTagPlaceholder: "e.g. Vocabulary",
    lessonCategoryLabel: "Filter category",
    lessonCategoryHint: "Type one or more filter keys separated by spaces (all vocabulary everyday pronunciation grammar culture hsk).",
    lessonColorLabel: "Card color",
    lessonActionLabel: "Button label",
    lessonActionPlaceholder: "Learn / Watch",
    lessonVideoLabel: "Show “Video” badge",
    lessonWordsLabel: "Words in this lesson",
    lessonWordChinese: "Chinese",
    lessonWordPinyin: "Pinyin",
    lessonWordMeaning: "Meaning",
    lessonWordExample: "Example (optional)",
    lessonAddWord: "+ Add word",
    lessonRemoveWord: "Remove",
    lessonOrderLabel: "Display order",
    lessonCreatedToast: "Lesson added! It now appears on the Learn page 🎉",
    lessonUpdatedToast: "Lesson updated ✓",
    lessonDeletedToast: "Lesson deleted",
    confirmDeleteLesson: "Delete this lesson with all its words? This cannot be undone.",
    editLessonDialogTitle: "Edit Lesson",
    lessonsImportedToast: "Default lessons imported into the panel 🎉 — now you can edit them here",

    // -------------------------------------------------------------
    //  ❓ تب FAQ — مدیریت سؤالات متداول (فاز ۴۶) — تنها منبع حقیقت: FaqItem
    // -------------------------------------------------------------
    tabFaq: "FAQ",
    faq: {
      subtitle: "The single source of truth for the public FAQ section — add, edit, reorder, publish or delete questions; the Support page updates instantly.",
      searchPlaceholder: "Search questions or answers…",
      empty: "No FAQ items yet — create the first question!",
      newButton: "+ New Question",
      editDialogTitle: "Edit FAQ",
      newDialogTitle: "New FAQ",
      questionLabel: "Question",
      questionPh: "e.g. How do free trials work?",
      answerLabel: "Answer",
      answerPh: "Write the full answer shown under the question…",
      categoryLabel: "Category",
      orderLabel: "Display order",
      orderHint: "Lower number = shown first",
      publishedLabel: "Published",
      publishedHint: "Unpublished items are hidden from the public Support page.",
      save: "Save question",
      saving: "Saving…",
      createSuccess: "FAQ added ✓",
      saveSuccess: "Changes saved ✓",
      deleteConfirm: "Archive this question? It will be hidden from the Support page but can be restored anytime.",
      confirmYes: "Yes, archive",
      networkError: "Could not reach the server — check your connection and try again.",
      badgePublished: "Published",
      badgeDraft: "Draft",
      moveUp: "Move up",
      moveDown: "Move down",
    },

    // -------------------------------------------------------------
    //  🎟️ تب Discounts — مدیریت کدهای تخفیف + پله‌های بسته (فاز ۴۷)
    // -------------------------------------------------------------
    tabDiscounts: "Discount Codes",
    discounts: {
      subtitle: "Server-side discount codes and automatic package tiers. Codes are validated and calculated by the server at order time — the browser can only send the code itself.",
      searchPlaceholder: "Search code or note…",
      empty: "No discount codes yet — create the first one!",
      newButton: "+ Create Discount Code",
      newDialogTitle: "Create Discount Code",
      editDialogTitle: "Edit Discount Code",
      codeLabel: "Code",
      codePh: "CHINESE10",
      typeLabel: "Type",
      typePercent: "Percentage (%)",
      typeFixed: "Fixed amount (USD)",
      valueLabel: "Value",
      startsAtLabel: "Starts at (optional)",
      endsAtLabel: "Expires at (optional)",
      activeLabel: "Active",
      activeHint: "Inactive codes are rejected at order time.",
      scopeClasses: "Applicable classes (empty = all)",
      classTypesLabel: "Class types (empty = all)",
      levelsLabel: "Levels (empty = all)",
      minSessionsLabel: "Minimum sessions",
      maxUsesLabel: "Max total uses (empty = unlimited)",
      perCustomerLabel: "Max uses per customer",
      noteLabel: "Internal note",
      save: "Save discount",
      saving: "Saving…",
      createSuccess: "Discount created ✓",
      saveSuccess: "Changes saved ✓",
      deleteConfirm: "Archive this code? It disappears from the checkout but its full history stays intact and it can be restored later.",
      confirmYes: "Yes, archive",
      networkError: "Could not reach the server — check your connection and try again.",
      badgeActive: "Active",
      badgeInactive: "Inactive",
      // 🗄️ فاز ۵۲ — حذف نرم/بایگانی (بند ۹)
      archivedBadge: "Archived",
      archiveTitle: "Archive",
      archiveHint: "Archived codes are invisible to customers and the pricing engine, but stay here so historical orders keep their exact original discount information.",
      archiveShow: "Show archive",
      archiveHide: "Hide archive",
      archiveEmpty: "Nothing archived yet.",
      archiveRestore: "Restore",
      archiveRestored: "Restored from archive ✓ (set it active when ready)",
      archivedToast: "Code archived ✓ — history preserved",
      usedOf: "{used} used{of}",
      unlimited: "",
      ofPart: " of {max}",
      appliesTo: "Applies to",
      allClasses: "All classes",
      // 🎟️ فاز ۵۰ — فیلتر نوع، مرتب‌سازی و تاریخ‌ها (بند ۱۳)
      typeAll: "All types",
      sortLabel: "Sort",
      sortNewest: "Newest first",
      sortOldest: "Oldest first",
      sortExpiring: "Expiring soonest",
      startsAtPrefix: "from",
      createdPrefix: "Created",
      perCustomerShort: "{n}/customer",
      deleteInUse: "This code has usage history and cannot be deleted. Deactivate it instead.",
      // پله‌های تخفیف خودکار بسته
      tiersTitle: "Automatic package discounts (by number of sessions)",
      tiersHint: "Example: 4–7 sessions → 5%, 12+ → 15%. Applied automatically to every new order — historical orders keep their original amount.",
      tiersSave: "Save tiers",
      tiersSaved: "Tiers saved ✓",
      tierMin: "From sessions",
      tierMax: "Up to sessions",
      tierMaxEmpty: "∞",
      tierPercent: "Discount %",
      addTier: "+ Add tier",
      removeTier: "Remove",
    },

    // -------------------------------------------------------------
    //  🗓️ ترجیحات برنامه در پنل ادمین — همه‌چیز به وقت تهران (فاز ۴۷)
    // -------------------------------------------------------------
    scheduling: {
      title: "Scheduling preferences",
      daysPerWeek: "Days per week",
      ackStatus: "Acknowledged",
      ackYes: "Yes",
      ackNo: "Missing",
      matchesTitle: "Potential Schedule Matches",
      viewByClass: "By class",
      viewByCustomer: "By customer",
      students: "{n} student(s)",
      sharedWindow: "Shared availability",
      tehranRef: "Tehran time",
      suggestionNote: "These are suggestions based on real overlaps (converted from each student's own time zone). The final schedule is decided by the institute.",
      noOverlap: "No real overlap between these students' preferences yet.",
      empty: "No scheduling preferences submitted yet — new registrations collect timezone, preferred days and times.",
    },

    // -------------------------------------------------------------
    //  🗓️ تب برنامهٔ جلسات (Scheduling) — تقویم/پیشنهاد/تنظیمات (فاز ۴۸)
    // -------------------------------------------------------------
    tabSchedule: "Scheduling",
    scheduleAdmin: {
      subtitle: "Propose class sessions, confirm them with students, and see every real session on one Tehran-time calendar. Preferences live in Registrations; this tab is the actual schedule.",
      newProposal: "New schedule proposal",
      viewCalendar: "Calendar",
      viewList: "List",
      weekOf: "Week of",
      prevWeek: "Previous week",
      nextWeek: "Next week",
      thisWeek: "This week",
      tzNote: "Calendar shows Tehran time (UTC+03:30). Each session keeps its original timezone — conversions never overwrite it.",
      statusAll: "All statuses",
      noSessions: "No sessions in this week yet. Use “New schedule proposal” to propose one.",
      listEmpty: "No schedules match the current filter.",
      // پیشنهاد
      formStudent: "Student (registered account email)",
      formStudentPlaceholder: "student@example.com",
      formClass: "Class",
      formClassPlaceholder: "Pick a class…",
      formDate: "Date (in the input timezone)",
      formTime: "Start time",
      formTz: "Input timezone",
      formTzHint: "Usually the student's own time zone from their registration.",
      formNote: "Note (optional)",
      formNotePlaceholder: "Anything the student should know…",
      preview: "Preview",
      previewDuration: "Session duration: {min} minutes (from class settings)",
      previewTehran: "Tehran time:",
      previewLocal: "Student's local time:",
      submit: "Propose to student",
      proposeOk: "Schedule proposed — the student has been notified and can now confirm it.",
      // جزئیات
      details: "Schedule details",
      auditTrail: "History",
      chain: "Reschedule chain",
      chainOlder: "Previous version",
      chainNewer: "Newer version",
      confirm: "Confirm",
      cancel: "Cancel session",
      complete: "Mark completed",
      reschedule: "Reschedule",
      rescheduleTitle: "Reschedule this session",
      rescheduleNote: "The previous schedule is kept in history and marked Rescheduled. The student must confirm the new time.",
      cancelReason: "Reason (optional)",
      cancelTitle: "Cancel this session?",
      cancelNote: "The student receives a notification. History is preserved.",
      seats: "Seats",
      createdBy: "Created by",
      order: "Order",
      student: "Student",
      classLabel: "Class",
      originalInput: "Proposed as (original input)",
      // تنظیمات
      settingsTitle: "Scheduling rules",
      settingsHint: "Rules apply to real sessions (proposals and confirmations). Registration preferences are never rejected by these rules.",
      minSpacing: "Minimum gap between a student's sessions (minutes)",
      defaultDuration: "Default session duration when a class has none (minutes)",
      settingsSaved: "Scheduling rules saved.",
      save: "Save rules",
      // وضعیت‌ها
      stPROPOSED: "Proposed",
      stCONFIRMED: "Confirmed",
      stRESCHEDULED: "Rescheduled",
      stCANCELLED: "Cancelled",
      stCOMPLETED: "Completed",
      // خطاها
      errCONFLICT: "This overlaps an existing session for this student.",
      errSPACING: "Not enough gap between this and another session of this student.",
      errCAPACITY_FULL: "This slot is already full.",
      errINVALID_TIME: "That wall-clock time does not exist in the selected time zone (DST).",
      ok: "Done",
    },

    // -------------------------------------------------------------
    //  🎓 تب کلاس‌ها (Classes) — مدیریت کامل کلاس‌ها و قیمت‌ها از پنل (فاز ۴۲)
    // -------------------------------------------------------------
    tabClasses: "Classes",
    classes: {
      subtitle: "The real source of truth for every class shown and sold on the site — prices, content, availability and payments all come from here.",
      searchPlaceholder: "Search name, slug, level or product ID…",
      filterStatus: "Status",
      filterType: "Type",
      filterLevel: "Level",
      filterAvailability: "Availability",
      availabilityAll: "Any availability",
      availabilityBookable: "Bookable online",
      availabilityNotBookable: "Not bookable",
      sortBy: "Sort by",
      sortName: "Name",
      sortPrice: "Price",
      sortCreated: "Created date",
      sortUpdated: "Updated date",
      sortStatus: "Status",
      sortOrder: "Manual order",
      dirAsc: "Ascending",
      dirDesc: "Descending",
      newClass: "New Class",
      colClass: "Class",
      colType: "Type",
      colLevel: "Level",
      colPrice: "Package price",
      colStatus: "Status",
      colUpdated: "Updated",
      colActions: "Actions",
      edit: "Edit",
      duplicate: "Duplicate",
      preview: "Preview",
      delete: "Delete",
      activate: "Activate",
      deactivate: "Deactivate",
      statusActive: "Active",
      statusInactive: "Inactive",
      statusDraft: "Draft",
      statusFull: "Full",
      statusArchived: "Archived",
      typeGroup: "Group",
      typePrivate: "Private",
      typeBoth: "Group / Private",
      featuredBadge: "Featured",
      levelAll: "All levels",
      emptyTitle: "No classes yet",
      emptyText: "Create your first class — it will immediately appear on the public Classes page once active.",
      loadingError: "Could not load the classes. Please try again.",
      // فرم ویرایش/ایجاد
      formTitleNew: "Create a new class",
      formTitleEdit: "Edit class",
      sectionBasic: "1 · Basic information",
      sectionTypeLevel: "2 · Class type & level",
      sectionPricing: "3 · Pricing",
      sectionSchedule: "4 · Schedule & capacity",
      sectionContent: "5 · Course content",
      sectionMedia: "6 · Media",
      sectionUrl: "7 · SEO / URL",
      sectionPublish: "8 · Publish & status",
      fTitle: "Class name",
      fTitlePh: "e.g. Beginner Mandarin Chinese",
      fShortDesc: "Short description (class card)",
      fShortDescPh: "One or two sentences shown on the class card…",
      fFullDesc: "Full description (details)",
      fFullDescPh: "Longer description shown inside the class details…",
      fCategory: "Category (public filter)",
      fCategoryHint: "Pick one or more categories — the class shows under those filters on the Classes page.",
      fColor: "Card color",
      fFeatured: "Featured class (highlighted on the home page)",
      fClassType: "Class type",
      fClassTypeHint: "Group and Private classes feed the registration matrix (class type + level → exact price). “Group / Private” classes are displayed with both badges and are sold from their own class page.",
      fLevel: "Level badge",
      fLevelPh: "e.g. HSK 1, HSK 2–3, All Levels",
      fRegisterLevels: "Serves these registration levels",
      fRegisterLevelsHint: "Used by the registration form matrix (class type + level → this class and its exact price).",
      fLevelAll: "Every level (All)",
      fCurrency: "Currency",
      fPricePerSession: "Price per session (display)",
      fPackageSessions: "Sessions in package",
      fPackagePrice: "Package price (USD) — authoritative order amount",
      fPackagePriceHint: "This exact amount is charged on the payment page for every new order. Existing paid orders keep their original amount.",
      fPriceNote: "Price note (display)",
      fPriceNotePh: "e.g. 12-session package: $130",
      fSessionDuration: "Session duration (minutes)",
      fFormat: "Format",
      fMaxStudents: "Maximum students",
      fMinStudents: "Minimum students",
      fSchedule: "Schedule (display)",
      fSchedulePh: "e.g. Schedule: TBC — weekday evenings",
      fStartDate: "Start date",
      fEndDate: "End date",
      fTimezone: "Time zone",
      fTimezonePh: "e.g. Asia/Tehran",
      fMeta: "Card info items",
      fMetaAdd: "Add info item",
      fHighlights: "What students will learn",
      fHighlightsPh: "One benefit per line…",
      fRequirements: "Requirements",
      fRequirementsPh: "One requirement per line…",
      fAudience: "Who this class is for",
      fAudiencePh: "One audience line per item…",
      fCurriculum: "Curriculum / topics",
      fCurriculumPh: "One topic or lesson per line…",
      fMaterials: "Materials included",
      fMaterialsPh: "One material per line…",
      fNotes: "Additional notes",
      fNotesPh: "Anything else shown at the bottom of the class details…",
      fImage: "Class image (URL)",
      fImageHint: "Upload a file or paste a path/URL — e.g. /images/classes/beginner.png. Uses the existing site media architecture.",
      fImageUpload: "Upload image",
      fImageUploading: "Uploading…",
      fImageUploadedToast: "Image uploaded ✓",
      fImageUploadError: "Upload failed — use a JPG/PNG/WebP/GIF up to 4MB.",
      fImageRemove: "Remove",
      fVideoUrl: "Intro video URL (optional)",
      fSlug: "URL slug",
      fSlugHint: "Public link: chinesetoon.com/#/classes/<slug>. Lowercase letters, numbers and hyphens only. Changing it changes the public link.",
      fProductId: "Payment product ID",
      fProductIdHint: "Stable identifier used by checkout links and orders. Locked automatically once the first order exists — then archive this class and create a new one instead of changing the ID.",
      fPackagePriceAuto: "Base package price — calculated automatically",
      fPackagePriceAutoHint: "Enter a price per session and the number of sessions — the base package price is calculated for you.",
      fStatus: "Status",
      fStatusHint: "Only Active classes are bookable online. “Full” classes stay visible but cannot be purchased. Drafts are hidden from the public site.",
      save: "Save class",
      saving: "Saving…",
      create: "Create class",
      creating: "Creating…",
      saveSuccess: "Class saved — public pages update right away.",
      createSuccess: "Class created.",
      duplicateSuccess: "Duplicated — the copy was saved as a draft.",
      deleted: "Class deleted.",
      statusChanged: "Status updated.",
      deleteConfirmTitle: "Delete class?",
      deleteConfirmText: "This permanently deletes “{title}”. This action cannot be undone. If the class has orders or registrations, deletion is refused — archive it instead.",
      deleteConfirmLabel: 'Type "DELETE" to confirm',
      deleteBlockedTitle: "This class cannot be deleted",
      saveError: "Could not save the class. Please check the errors and try again.",
      networkError: "Network error — please try again.",
      previewTitle: "Preview — how this class appears on the public site",
      previewDraftNote: "This class is a draft — it is only visible here and in this preview, not on the public Classes page.",
      previewOpenPublic: "Open public page",
      sessionsCount: "sessions",
      perSession: "/ session",
      orderHint: "Lower manual order = shown first",
      fSortOrder: "Manual display order",
      listTotal: "{total} class(es)",
      bookableYes: "Bookable",
      bookableNo: "Not bookable",
    },

    // -------------------------------------------------------------
    //  ⚙️ تب تنظیمات (Settings) — نوار اعلان بالای سایت + آمار داشبورد صفحهٔ اول
    // -------------------------------------------------------------
    // 🗂️ فاز ۵۲ — تب داشبورد و پشتیبان‌گیری
    tabDashboard: "Dashboard",
    tabBackup: "Backup",
    // 🧾 فاز ۵۳ — تب لاگ‌ها و خروجی داده
    tabLogs: "Logs & Export",
    tabSettings: "Settings",
    // ✏️ متن‌های هیروی خانه (فاز ۲۲)
    settingsHeroTitle: "Home hero text",
    settingsHeroHint:
      "The big welcome text on top of the home page. Leave it as is, or write your own headline — visitors see the change immediately after saving.",
    settingsHeroBadgeLabel: "Badge (small text)",
    settingsHeroTitleTopLabel: "Headline — line 1",
    settingsHeroTitleMiddleLabel: "Headline — line 2",
    settingsHeroTitleHighlightLabel: "Headline — green line",
    settingsHeroTitleHighlightHint: "This line is shown in the brand green color.",
    settingsHeroSubtitleLabel: "Subtitle under the headline",
    settingsAnnounceTitle: "Top announcement bar",
    settingsAnnounceHint:
      "The gradient banner at the very top of the site. When you change the message, the version id is bumped automatically — the bar reappears for visitors who closed the old one.",
    settingsAnnounceEnabled: "Show the announcement bar",
    settingsAnnounceIdLabel: "Version id (automatic)",
    settingsAnnounceIdHint:
      "No need to touch this — saving a new message adds a fresh version automatically. Closing the banner only hides it for the current browser session.",
    settingsAnnounceEmojiLabel: "Emoji",
    settingsAnnounceTextLabel: "Message *",
    settingsAnnounceTextPlaceholder: "e.g. Spring semester enrollment is now open!",
    settingsAnnounceCtaLabel: "Button label",
    settingsAnnounceCtaPageLabel: "Button goes to",
    settingsStatsTitle: "Home stats dashboard",
    settingsStatsHint:
      "The four animated numbers under the hero on the home page. Change the values, suffixes and labels — or add/remove rows (2 to 8 items).",
    settingsStatValueLabel: "Value",
    settingsStatSuffixLabel: "Suffix",
    settingsStatSuffixPlaceholder: "+ / % or empty",
    settingsStatLabelLabel: "Label",
    settingsStatLabelPlaceholder: "e.g. Happy Learners",
    settingsAddStat: "+ Add stat",
    settingsRemoveStat: "Remove",
    saveButton: "Save",
    settingsSaveButton: "Save changes",
    settingsSavingButton: "Saving...",
    settingsSavedToast: "Settings saved ✓ — the site updates immediately",
    settingsErrorToast: "Could not save — check the fields and try again.",
    // 🔑 کارت «Panel access» — تغییر نام کاربری/رمز ورود پنل
    credTitle: "Panel access",
    credHint:
      "Change the username or password you use to sign in here. You are signed in with the current password first — after saving, every session (including this one) is signed out and you log in again with the new credentials.",
    credUsernameLabel: "Username",
    credUsernameHint: "3–40 characters — letters, numbers, dot, underscore or dash",
    credCurrentLabel: "Current password *",
    credNewLabel: "New password",
    credNewHint: "Leave empty to keep the current password — otherwise 8–128 characters",
    credConfirmLabel: "Repeat new password",
    credSaveButton: "Update access",
    credSavingButton: "Updating...",
    credDoneToast: "Access updated ✓ — please sign in with your new credentials",
    credMismatchError: "The two new passwords do not match.",
    credCustomBadge: "Custom credentials saved",
    credDefaultBadge: "Using default credentials — set your own password!",
    // 📊 راهنمای خروجی CSV (کلیدهای exportCsvMessages/Registrations/Newsletter/Reviews بالا تعریف شده‌اند)
    exportCsvHint: "Download this list as a spreadsheet file",
  },

  // ---------------------------------------------------------------
  //  📰 وبلاگ (صفحهٔ #/blog)
  //  ⚠️ خودِ مقاله‌ها از پنل مدیریت (#/admin → تب Blog) اضافه می‌شوند
  //  و در دیتابیس ذخیره می‌شوند — اینجا فقط متن‌های ثابت صفحه است.
  // ---------------------------------------------------------------
  blog: {
    eyebrow: "Chinese Toon Blog",
    title: "News, Culture & Study Tips",
    subtitle:
      "Fresh articles from our teachers — class announcements, Chinese culture stories, and practical study tips.",
    // برچسب دسته‌بندی‌ها (دکمه‌های فیلتر بالای مقاله‌ها)
    tags: [
      { key: "all", label: "All Posts" },
      { key: "news", label: "News" },
      { key: "culture", label: "Culture" },
      { key: "tips", label: "Study Tips" },
      { key: "hsk", label: "HSK" },
    ],
    featuredLabel: "Featured", // برچسب مقالهٔ اصلی (اولین مقاله)
    readMore: "Read Article", // دکمهٔ روی کارت‌ها
    emptyTitle: "No articles here yet",
    emptyText: "New articles are on the way — check back soon!",
    // ⚠️ خطای واقعی واکشی — از حالت «خالی» جدا است (حالت صادقانه)
    loadFailed: "Couldn't load articles — check your connection.",
    retry: "Retry",
    // 🔍 جستجو بین مقاله‌ها
    searchPlaceholder: "Search articles...",
    noResults: "No articles match your search.",
    readingTime: "min read", // کنار تاریخ («3 min read»)
    viewsLabel: "views", // شمارندهٔ بازدید مقاله («128 views»)
    detail: {
      back: "← Back to all articles", // دکمهٔ بازگشت داخل مقاله
      publishedOn: "Published", // برچسب تاریخ انتشار
    },
    // 🔗 اشتراک‌گذاری مقاله (بالای صفحهٔ هر مقاله)
    share: {
      label: "Share this article",
      copy: "Copy Link",
      copied: "Link copied! ✓", // بعد از کپی موفق
      telegram: "Share on Telegram",
      x: "Share on X",
      whatsapp: "Share on WhatsApp",
    },
    // وقتی آدرس مقاله اشتباه یا حذف‌شده باشد
    notFoundTitle: "Article not found",
    notFoundText: "This article may have been removed, or the link is incorrect.",
    readNext: "Read Next", // مقاله‌های پیشنهادی انتهای مقاله
    // 🔥 پربازدیدترین مقاله‌ها (بالای فهرست بلاگ — اگر بازدیدی ثبت شده باشد)
    trending: {
      label: "Most read",
      subtitle: "What learners are reading right now",
    },
    // 🧭 فهرست «در این صفحه» — کنار مقاله‌های بلند (دسکتاپ)
    toc: {
      label: "On this page",
      empty: "Short article — no sections", // اگر مقاله تیتر بخش نداشت نشان داده نمی‌شود
    },
    // 🔤 اندازهٔ فونت مقاله — برای راحتی چشم (A−/A/A+)
    fontSize: {
      label: "Text size",
      decrease: "Smaller text",
      reset: "Default text size",
      increase: "Larger text",
    },
    // 🖨️ چاپ/ذخیرهٔ PDF مقاله
    print: "Print / PDF",
    // 🔖 نوار «ادامهٔ مطالعه» بالای لیست وبلاگ — آخرین مقاله‌ای که در همین بازدید
    //    نیمه‌کاره مانده. برای پنهان کردن قابلیت، continueEnabled را false کنید.
    continueEnabled: true, // 👈 false = نوار «Continue reading» نشان داده نشود
    continueLabel: "Continue reading",
    // 📬 دعوت به عضویت خبرنامه، انتهای هر مقاله
    cta: {
      title: "Enjoyed this article?",
      text: "Get free Chinese tips and lesson updates straight to your inbox.",
      button: "Subscribe to the Newsletter", // اسکرول به فرم خبرنامهٔ فوتر
    },
  },

  // ---------------------------------------------------------------
  //  📣 نوار اعلان (بالای سایت، زیر هدر) — برای خبرهای فوری مثل شروع ثبت‌نام
  //    enabled = نمایش/عدم نمایش نوار
  //    id = نسخهٔ اعلان؛ هر بار متن جدید می‌دهید این id را هم عوض کنید
  //    تا نوار برای کسانی که اعلان قبلی را بسته‌اند دوباره دیده شود
  //    ctaPage = صفحه‌ای که دکمه به آن می‌رود (home/classes/learn/about/blog/support/register)
  // ---------------------------------------------------------------
  announcement: {
    enabled: true,
    id: "autumn-2026", // 👈 با هر اعلان جدید عوضش کنید
    emoji: "📣",
    text: "Autumn semester enrollment is now open — early birds get a free trial lesson!",
    ctaLabel: "Save my spot",
    ctaPage: "register",
  },

  // ---------------------------------------------------------------
  //  🧭 منوی ناوبری (هدر و فوتر)
  //  👇 اگر می‌خواهید منوی جدیدی اضافه/حذف کنید، همین‌جا را ویرایش کنید
  // ---------------------------------------------------------------
  navigation: [
    { key: "home", label: "Home" },
    { key: "classes", label: "Classes" },
    { key: "learn", label: "Learn" },
    { key: "about", label: "About" },
    { key: "blog", label: "Blog" }, // 🆕 وبلاگ
    { key: "reviews", label: "Reviews" }, // 🆕 صفحهٔ نظرات
    { key: "support", label: "Support" }, // 🆕 بخش پشتیبانی
  ],
  joinButton: "Join a Class", // دکمهٔ هدر

  // ---------------------------------------------------------------
  //  💳 پرداخت دستی کارت بانکی (فاز ۵۹ — جایگزین کامل جریان USDT/TRON)
  //  قیمت‌ها از جدول کلاس‌ها (DB) خوانده می‌شوند — این لیست فقط fallback است.
  //  شمارهٔ کارت و اطلاعات بانکی از پنل ادمین (SiteSetting) می‌آید — نه اینجا!
  // ---------------------------------------------------------------
  payments: {
    products: [
      // 👇 برای هر قلم: id یکتا، classTitle = دقیقاً عنوان کلاس در صفحهٔ کلاس‌ها
      //    (برای اتصال دکمهٔ پرداخت به همان کلاس)، amountUsd = مبلغ بسته
      { id: "beginner-chinese-12", classTitle: "Beginner Chinese", label: "Beginner Chinese — 12-session package", amountUsd: 130 },
      { id: "elementary-chinese-16", classTitle: "Elementary Chinese", label: "Elementary Chinese — 16-session package", amountUsd: 200 },
      { id: "conversational-chinese-10", classTitle: "Conversational Chinese", label: "Conversational Chinese — 10-session package", amountUsd: 135 },
      { id: "intermediate-chinese-16", classTitle: "Intermediate Chinese", label: "Intermediate Chinese — 16-session package", amountUsd: 200 },
      { id: "hsk-preparation-8", classTitle: "HSK Preparation", label: "HSK Preparation — 8-session package", amountUsd: 135 },
      { id: "private-lessons-1", classTitle: "Private Lessons", label: "Private lesson — single session", amountUsd: 25 },
    ],
    ui: {
      // مرحلهٔ چک‌اوت — بازبینی سفارش + کد تخفیف (قبل از رسیدن به صفحهٔ پرداخت)
      checkoutEyebrow: "Secure checkout",
      checkoutTitle: "Review your order",
      checkoutSubtitle:
        "Enter a discount code if you have one — your final amount is calculated on our server before you pay anything.",
      productLabel: "Product",
      amountLabel: "Amount",
      orderIdLabel: "Order ID",
      copyButton: "Copy",
      copied: "Copied!",
      // 🎟️ مرحلهٔ چک‌اوت: کد تخفیف قبل از رسیدن به صفحهٔ پرداخت
      stageReview: "Review order",
      originalPrice: "Original price",
      packageDiscount: "Package discount",
      codeDiscountLabel: "Discount code",
      finalPrice: "Final price — pay exactly this",
      continuePayment: "Continue to Payment",
      creatingOrder: "Creating your order…",
      codeHave: "Have a discount code?",
      codePlaceholder: "e.g. WELCOME20",
      codeApply: "Apply",
      codeRemove: "Remove",
      codeApplied: "applied — recalculated by our server",
      codeInvalid: "Invalid or expired discount code.",
      // 🎟️ پیام شفاف برای هر دلیل رد کد (کلیدها = DiscountRejection سمت سرور)
      codeRejected: {
        NOT_FOUND: "This code doesn't exist. Please check for typos.",
        INACTIVE: "This code is currently disabled.",
        NOT_STARTED: "This code isn't active yet.",
        EXPIRED: "This code has expired.",
        MAX_USES: "This code has reached its usage limit.",
        PER_CUSTOMER: "You have already used this code.",
        MIN_SESSIONS: "This code requires a larger session package.",
        CLASS_SCOPE: "This code doesn't apply to this class.",
        TYPE_SCOPE: "This code doesn't apply to this class type.",
        LEVEL_SCOPE: "This code doesn't apply to your registration level.",
        ZERO_FINAL: "This code would reduce the total to $0 — please contact us to arrange your class.",
      } as Record<string, string>,
      sessionsLine: "{sessions} sessions × {perSession} per session",
      checkoutSecureNote:
        "All amounts are calculated on our server. Your discount is locked in before you reach the payment page.",
      // 💰 فاز ۶۰ — اعلام صریح مبلغ دقیق پرداخت در خود صفحهٔ بازبینی (بند ۱ تسک)
      reviewPayExact: "Please pay exactly {amount} USD — this is the final amount after all discounts.",
      // 💳 صفحهٔ پرداخت دستی — اطلاعات کارت بانکی
      payTitle: "Manual Bank Card Payment",
      paySubtitle:
        "Transfer the exact final amount to the bank card below, then upload your payment receipt. Our team verifies every payment manually.",
      cardSectionTitle: "Pay via Bank Card",
      cardNumberLabel: "Card Number",
      copyCard: "Copy Card Number",
      cardHolderLabel: "Card Holder",
      bankLabel: "Bank",
      instructionsLabel: "Instructions",
      transferExact: "Please transfer exactly {amount} USD to the following card.",
      amountBreakdownTitle: "Payment amount",
      discountRow: "Discount",
      finalAmountLabel: "Final amount",
      payExpiryNote: "Please complete the payment and upload your receipt before {date}.",
      // 🧾 آپلود رسید
      uploadTitle: "Upload your payment receipt",
      uploadHint:
        "After transferring the exact amount, upload a clear image of your payment receipt so we can verify your payment.",
      uploadDrop: "Drag & drop your receipt here, or click to choose a file",
      uploadFormats: "JPG, PNG, WEBP or PDF — up to 5 MB",
      receiptPreviewTitle: "Payment Receipt",
      changeReceipt: "Change Receipt",
      removeReceipt: "Remove",
      submitReceipt: "Submit Receipt",
      submitting: "Uploading…",
      fileTooLarge: "The file is larger than 5 MB. Please choose a smaller image.",
      fileTypeInvalid: "Only JPG, PNG, WEBP images or PDF files are accepted.",
      uploadFailed: "Could not upload the receipt. Please try again.",
      // وضعیت‌های پرداخت (پس از ارسال رسید)
      underReviewTitle: "Payment submitted successfully",
      underReviewNote:
        "Your payment receipt has been submitted and is waiting for verification. We'll notify you as soon as our team reviews it.",
      approvedTitle: "Payment approved 🎉",
      approvedNote:
        "Your payment has been confirmed. Our team will contact you to schedule your class sessions — track your enrollment in your account.",
      rejectedTitle: "Payment rejected",
      rejectedReasonLabel: "Reason",
      rejectedNote: "You can upload a new receipt for this same order — no need to create a new one.",
      uploadNewReceipt: "Upload New Receipt",
      viewReceipt: "View submitted receipt",
      summaryTitle: "Order summary",
      methodLabel: "Payment method",
      methodManual: "Manual Bank Card",
      statusLabels: {
        PENDING: "Unpaid",
        RECEIPT_SUBMITTED: "Under Review",
        PAID: "Approved",
        REJECTED: "Rejected",
        EXPIRED: "Expired",
        CANCELLED: "Cancelled",
        DETECTED: "Processing (legacy)",
        UNDERPAID: "Underpaid (legacy)",
      } as Record<string, string>,
      legacyNote:
        "This order was created with a previous online payment method and can no longer be paid online. Please contact support.",
      expiredNote: "This payment order has expired. Please start again with a new order.",
      cancelledNote: "This order was cancelled. If you think this is a mistake, contact us.",
      newOrderButton: "Back to classes",
      submittedOn: "Submitted on",
      reviewedOn: "Reviewed on",
      loading: "Loading order...",
      notFound: "Order not found. Check the link or start a new payment.",
      notConfigured: "Manual bank-card payment is not enabled yet — please contact us to arrange your class.",
      // 🎯 محصول نامعتبر (productId ناشناخته/ترکیب ناموجود) — بدون هیچ قیمتی
      badProduct: "This class or package is not available for payment. Please go back and pick your class again.",
      retryButton: "Try again",
      backButton: "Back",
      // پرداخت بلافاصله بعد از ثبت‌نام موفق — باز شدن خودکار صفحهٔ پرداخت
      payNextTitle: "One last step — complete your payment",
      payNextNote: "Your registration is in. Your package:",
      payNextOpening: "Opening the secure payment page in",
      payNextUnit: "seconds",
      payNextButton: "Continue to payment",
      payNextLater: "I'll pay later",
    },
  },
};

// ---------------------------------------------------------------------
//  نوع داده‌ها (فقط برای TypeScript — نیازی به تغییر نیست)
// ---------------------------------------------------------------------
export type PageKey =
  | "home"
  | "classes"
  | "learn"
  | "about"
  | "blog"
  | "reviews"
  | "support"
  | "register"
  | "account"
  | "admin";

export type SiteContent = typeof siteContent;
