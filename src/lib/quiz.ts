export type Question =
  | { id: string; kind: "chips"; prompt: string; options: string[]; max?: number; section: string }
  | { id: string; kind: "single"; prompt: string; options: string[]; section: string }
  | { id: string; kind: "scale"; prompt: string; low: string; high: string; trait: TraitKey; reverse?: boolean; section: string }
  | { id: string; kind: "text"; prompt: string; placeholder: string; section: string };

export type TraitKey = "openness" | "conscientiousness" | "extraversion" | "agreeableness" | "ambition";
export type Answers = Record<string, string | string[] | number>;

export const LIFE_STAGES = [
  "single", "dating", "engaged", "married", "expecting", "new parent", "young kids", "teens",
  "single parent", "empty nester", "grandparent", "founder", "small business owner", "corporate",
  "remote worker", "student", "retired", "new to area",
];

export const INTERESTS = [
  "🎮 video games", "🔥 grilling", "🍺 craft beer", "🍷 wine", "☕ coffee", "🏃 running", "🏋️ lifting",
  "⛳ golf", "🥾 hiking", "🚴 cycling", "⛷️ skiing", "🏓 pickleball", "🏀 basketball", "⚽ soccer",
  "🎣 fishing", "⛵ boating", "🏕️ camping", "🍳 cooking", "🧁 baking", "🎲 board games", "📚 reading",
  "🎧 podcasts", "🎸 music", "🎬 movies", "💻 tech", "🚀 startups", "📈 investing", "✈️ travel",
  "📷 photography", "🐶 dogs", "🌱 gardening", "🔨 DIY", "🚗 cars", "🧘 yoga", "🎨 art", "🧗 climbing", "❓ trivia",
];

export const QUIZ: Question[] = [
  { id: "interests", section: "Your stuff", kind: "chips", prompt: "What do you love doing?", options: INTERESTS },
  { id: "teams", section: "Your stuff", kind: "chips", prompt: "Who do you root for?", options: ["Patriots", "Red Sox", "Celtics", "Bruins", "Revolution", "Not a sports person"] },
  { id: "friday", section: "Your stuff", kind: "single", prompt: "Your perfect Friday night is…", options: ["Backyard grill + beers", "Game night (video or board)", "Out at a bar or brewery", "Hosting a dinner party", "Couch, takeout, a movie", "A concert or show"] },
  { id: "saturday", section: "Your stuff", kind: "single", prompt: "Saturday morning, you're…", options: ["Working out", "Coffee + errands", "Kid / family activities", "Working on a project", "Sleeping in, obviously", "Outdoors somewhere"] },

  { id: "s_party", section: "How you're wired", kind: "scale", prompt: "After a big party you feel…", low: "Drained", high: "Energized", trait: "extraversion" },
  { id: "s_newplace", section: "How you're wired", kind: "scale", prompt: "New restaurant vs. your usual spot?", low: "The usual", high: "Somewhere new", trait: "openness" },
  { id: "s_calendar", section: "How you're wired", kind: "scale", prompt: "How organized is your life?", low: "Chaos goblin", high: "Color-coded calendar", trait: "conscientiousness" },
  { id: "s_help", section: "How you're wired", kind: "scale", prompt: "A friend needs help moving on Saturday.", low: "I'm busy, sorry", high: "I'm bringing the truck", trait: "agreeableness" },
  { id: "s_plan", section: "How you're wired", kind: "scale", prompt: "How much do you think about the 5-year plan?", low: "Day by day", high: "Constantly", trait: "ambition" },
  { id: "s_debate", section: "How you're wired", kind: "scale", prompt: "Debating big ideas over a drink?", low: "Keep it light", high: "Let's go deep", trait: "openness" },
  { id: "s_talk", section: "How you're wired", kind: "scale", prompt: "In a group, you're usually…", low: "Listening", high: "Telling the story", trait: "extraversion" },
  { id: "s_grind", section: "How you're wired", kind: "scale", prompt: "Weekends are for…", low: "Recharging", high: "Getting ahead", trait: "ambition" },
  { id: "s_follow", section: "How you're wired", kind: "scale", prompt: "When you say you'll do something…", low: "…I'll get to it", high: "…it's done", trait: "conscientiousness" },
  { id: "s_patience", section: "How you're wired", kind: "scale", prompt: "Someone's running 20 minutes late.", low: "Annoyed", high: "No worries", trait: "agreeableness" },

  { id: "group", section: "Friendship style", kind: "single", prompt: "Ideal hang size?", options: ["Just one-on-one", "3–4 people", "The bigger the better", "Families welcome, kids and all"] },
  { id: "often", section: "Friendship style", kind: "single", prompt: "How often do you want to see friends?", options: ["Every week", "Every couple of weeks", "Once a month", "Whenever life allows"] },
  { id: "want", section: "Friendship style", kind: "chips", prompt: "What kind of friends are you looking for?", options: ["Dad / mom friends", "Couples friends", "Workout buddy", "Game night crew", "Business sounding board", "Adventure partner", "Deep-talk friend", "Drinking buddy"] },
  { id: "values", section: "Friendship style", kind: "chips", prompt: "Pick up to 3 things you care about most.", max: 3, options: ["family", "ambition", "adventure", "faith", "health", "humor", "loyalty", "curiosity", "community", "creativity", "freedom", "honesty"] },

  { id: "now", section: "In your words", kind: "text", prompt: "What's going on in your life right now?", placeholder: "e.g. We've got a baby on the way in January and I'm scaling my company…" },
  { id: "working", section: "In your words", kind: "text", prompt: "What are you working toward?", placeholder: "Big or small — a business goal, a marathon, being a great dad…" },
  { id: "known", section: "In your words", kind: "text", prompt: "What are you known for among your friends?", placeholder: "The guy who always hosts. The one with the smoker. The planner…" },
  { id: "ideal", section: "In your words", kind: "text", prompt: "Describe your ideal friend.", placeholder: "Someone who…" },
];

export const TALK_PROMPTS = [
  "Tell me about yourself — what's going on in your life right now?",
  "What does a perfect weekend look like for you?",
  "What are you working toward? Career, family, anything.",
  "What are you known for among your friends? What do you love doing?",
  "Describe the kind of friend you're hoping to find.",
];

export const stripEmoji = (s: string) => s.replace(/^[^\p{L}\p{N}]+/u, "").trim();
