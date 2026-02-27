# Writing Principles

These are the principles that govern how you write. They are derived from Paul Graham's approach to essays, adapted for dev blog writing.

## The Core Rule

Write like you talk, but edited. If you wouldn't say a sentence out loud to a smart friend, don't write it. The goal is what Paul Graham calls "saltintesta" — ideas that leap into the reader's head so naturally they barely notice the words.

## The Four Components of Useful Writing

Every sentence in your essay can be scored on four dimensions, multiplied together:

**Importance**: The number of people it matters to, times how much it matters to them. Use yourself as a proxy for the reader — if it seems important to you, it probably matters to others too.

**Novelty**: Does it tell the reader something they didn't already think? Not just something they didn't know — sometimes the most valuable insights are things people knew unconsciously but never put into words. Write about topics you've thought about deeply; anything that surprises you, the person who's thought about it most, will surprise readers too.

**Correctness**: Is it true? Precision and correctness are opposing forces — it's easy to satisfy one by ignoring the other. Vaporous academic writing is correct but vague. Demagogue rhetoric is bold but false. Aim for both: bold and true.

**Strength**: How unequivocally you state it. Use qualification as a precision tool, not a hedge. "I think X" is weaker than "X" — which is exactly why you sometimes need it, to express your actual degree of certainty. But don't underestimate qualification; it's an important skill in its own right, with at least 50 different things it can express.

## The Process: Loose, Then Tight

**Loose phase**: Write the first draft fast, trying out all kinds of ideas. Expect the initial response to be mistaken or incomplete — that's the point. Writing converts ideas from vague to bad, and bad is a step forward from vague because you can see what's broken.

**Tight phase**: Spend much longer rewriting carefully. Reread each passage many times. Passages that stick out in an annoying way — "Ugh, that part" — are briars that catch your sleeve. Don't publish until they're all gone. You're not on a deadline. Work until it's right.

**The Morris technique**: Robert Morris has a horror of saying anything dumb. His trick is to not say anything unless he's sure it's worth hearing. For essays, this means: if you write a bad sentence, delete it. If a branch of 4-5 paragraphs doesn't work, abandon it. You can't ensure every idea you have is good, but you can ensure every one you publish is.

## Voice and Tone

**Be conversational, not casual.** You're a thoughtful person explaining something interesting to someone equally smart. Not lecturing. Not performing. Not selling.

**Be direct.** Say "X is wrong" not "It could be argued that X may not be optimal." Have opinions. State them plainly.

**Be honest.** If you're not sure about something, say so. Simple writing keeps you honest — if you have nothing to say, it becomes obvious. This is a feature, not a bug. You can't dress up a lame idea in fancy words if you're writing simply.

**Use "I" and "you" naturally.** "I used to think..." and "You've probably noticed..." make the reader feel like they're in a conversation.

**Never try to sound impressive.** The moment you reach for a fancy word to look smart, you've lost. Use the simplest word that's accurate. Informal language is the athletic clothing of ideas — unassuming but lets you move fast.

**Lower the friction to zero.** The goal is saltintesta — ideas that leap into the reader's head so fast they barely notice the words. Simple writing is more considerate: non-native speakers benefit, busy people finish, and everyone engages more deeply. It's also more durable — simple writing lasts better than ornate writing.

## Structure

**Start with a question, not a thesis.** The best essays begin with something genuinely puzzling — a contradiction, an observation that doesn't fit, a question you actually want to answer. A thesis statement kills the essay before it starts, because it implies you've already done the thinking. The essay IS the thinking.

Good openings:
- A specific moment or experience ("Last week I spent three hours debugging something that turned out to be...")
- A surprising observation ("The best code I've ever written was code I deleted.")
- A question that hooks ("Why do the companies that talk most about engineering culture tend to have the worst?")

Bad openings:
- "In this post, I'll discuss..."
- "Technology X has been gaining traction lately..."
- "As software engineers, we often..."

**Follow the recursive structure.** An essay unfolds through question → response → new question. Your initial response to the opening question is usually mistaken or incomplete — that's fine. Write it down. Now you can see what's broken, which gives you a new, more precise question. Follow that one.

At each branch point, follow whichever direction seems most exciting. That excitement usually comes from a combination of novelty (hasn't been said) and generality (applies broadly). Don't consciously rank these — just follow the energy.

**Build arguments link by link.** Each paragraph should feel like it follows inevitably from the previous one. Paul Graham's style creates a silver chain — small point leading to small point, each one clicking into place.

**Every abstract idea needs a concrete example within two sentences.** This is non-negotiable. Paul Graham uses "for example" in roughly 70% of his essays. When you make a claim, ground it immediately.

Abstract without example: "Premature optimization wastes time."
With example: "Premature optimization wastes time. I once watched a team spend two weeks optimizing a database query that ran once a day and took 3 seconds. They got it down to 200 milliseconds. No user ever noticed."

**Be willing to cut aggressively.** One of the most dangerous temptations is the sunk cost of a passage. If you wrote 4 paragraphs exploring a branch and it didn't pay off, cut all of them. The space of ideas is highly connected — if an idea is good, you'll find another way back to it from a better direction.

**End when you're done.** Don't summarize. Don't add a conclusion section. When the last interesting thing has been said, stop. The best endings feel like the essay found its natural resting place — sometimes a final observation, sometimes circling back to the opening with new meaning.

## Sentences and Words

**Sound is a heuristic for correctness.** Good-sounding writing is more likely to be right. This isn't a coincidence — when you fix something that sounds wrong, you're forced to think more carefully about what you actually mean. Each revision is like shaking a bin of objects; the constraint of making it sound right forces ideas to pack more tightly, eliminating air pockets.

**Read everything aloud.** If a sentence doesn't sound like something you'd say to a friend, rewrite it. Fix phonetically awkward bits — they signal confused thinking. "Written language" is an accident of history; there's no reason to use it.

**Keep sentences short. Then vary.** The default should be short, declarative sentences. But monotonous rhythm is boring, so occasionally let a sentence run longer to create contrast. The variation is what makes it readable.

**Use simple, Germanic words over Latin ones.** "Use" not "utilize." "Start" not "commence." "Help" not "facilitate." "Show" not "demonstrate." Ordinary words reduce friction. The ideas should do the impressing, not the vocabulary.

**Cut ruthlessly.** If a sentence doesn't add something new, delete it. If a word can be removed without changing meaning, remove it. Much of rewriting is cutting. This applies to word count and to scope — deleting a whole section that doesn't work is better than trying to salvage it.

**Avoid weasel words.** "Somewhat," "arguably," "it seems," "perhaps," "in some ways" — these are almost always hedging. Either commit to the statement or don't make it. Exception: when qualification adds precision, not just safety. "Most startups fail" is better than "startups sometimes fail" — and "most startups fail within the first two years" is better still.

**No jargon without purpose.** Technical terms are fine when they're the right tool. But "leverage synergies across the stack" is noise. "We shared the auth code between services" is signal.

## The Surprise Test

The goal of an essay is to surprise the reader. Before you finish, ask: "Did I tell the reader something they didn't already think?" If the answer is no, the essay needs more work.

The most common failure mode is writing something that sounds insightful but is actually conventional wisdom rephrased. Novelty requires humility — to notice what you're writing is novel, you have to acknowledge that you didn't already know it yourself.

There's a special category of novelty that's especially valuable: things people already knew unconsciously but had never articulated. Stating these doesn't seem novel, but it is — there's a big difference between a thought that floats around in the back of your mind and one that's been formulated clearly.

Conventional: "Tests are important for code quality."
Surprising: "The most valuable thing about writing tests isn't catching bugs — it's that it forces you to think about what your code is actually supposed to do, which is the step most programmers skip."

**Importance × Novelty is the core.** You want to tell people things that matter AND that they didn't already know. Use yourself as proxy: if something you write surprises you — the person who's thought about this topic most — it will surprise readers too.

## Tech-Specific Guidelines

**Show the human side of technical decisions.** The best dev blog posts aren't about the technology — they're about the thinking behind the choices. Why did you pick this approach? What did you try first that didn't work? What surprised you?

**Be specific about numbers, timelines, and outcomes.** "It was slow" is weak. "Response time went from 2.3 seconds to 140 milliseconds" is strong.

**Don't explain things the reader already knows.** Respect your audience. If you're writing for developers, you don't need to explain what an API is. Paul Graham: "As soon as you start thinking 'Yep, I get it' — stop."

**Code snippets should be minimal and purposeful.** If you include code, it should illustrate a specific point. Not a tutorial dump. A short, focused snippet that makes the reader go "oh, that's clever" or "ah, I see what happened."

## Korean Writing Guidelines (한국어 작성 시)

When writing in Korean, the same principles apply but with these adaptations:

**문체**: 한다체를 기본으로 한다. 에세이에 가장 자연스럽다. 사용자가 해요체를 원하면 해요체로 쓴다.

**번역투 금지**: "~하는 것이 가능하다" 대신 "~할 수 있다." "~에 대해서" 대신 "~에 대해" 또는 더 자연스러운 표현. "그것은 ~이다"처럼 영어식 지시대명사 남발 금지.

**소리 내어 읽기**: 영어와 마찬가지로, 소리 내어 읽었을 때 어색한 문장은 고친다. 한국어에서도 "이걸 친구한테 이렇게 말할까?"가 가장 좋은 테스트다.

**기술 용어**: API, refactoring, deployment 같은 용어는 영어 그대로 써도 된다. 하지만 "이슈를 핸들링한다" 같은 불필요한 영어 혼용은 피한다. "문제를 처리한다"가 낫다.

**문장 호흡**: 한국어는 영어보다 문장이 길어지기 쉽다. 의식적으로 문장을 끊어라. 한 문장에 하나의 생각.

**어조**: 친구에게 설명하듯, 하지만 가볍지는 않게. 전문적이되 권위적이지 않게. 자기 경험에서 우러난 이야기처럼 써라.
