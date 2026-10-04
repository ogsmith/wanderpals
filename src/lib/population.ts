import { PANTS, SHIRTS } from "./palette";
import { townCoords } from "./towns";
import type { AvatarLook, Townsperson } from "./types";

// Sample characters for the landing page and promo video. They are never shown as real people in the app.

type Seed = [
  name: string,
  age: number,
  town: string,
  occupation: string,
  bio: string,
  lifeStage: string[],
  interests: string[],
  values: string[],
  traits: [o: number, c: number, e: number, a: number, amb: number],
  look: Partial<AvatarLook> & Pick<AvatarLook, "skin" | "hair" | "hairStyle">,
];

const SEEDS: Seed[] = [
  ["Mike Donnelly", 32, "Wakefield", "Founder, HVAC software startup", "Bootstrapped a SaaS for contractors. First kid due in March. Will talk smoker temps for hours.", ["married", "expecting", "founder"], ["grilling", "craft beer", "video games", "Patriots", "startups"], ["ambition", "family", "loyalty"], [62, 74, 60, 70, 90], { skin: "fair", hair: "brown", hairStyle: "short", eyes: "blue", shirt: "#c0392b" }],
  ["Priya Raman", 30, "Melrose", "Product lead at a health-tech company", "Just had our first, a daughter. Trying to keep my Zelda save file alive on 4 hours of sleep.", ["married", "new parent", "corporate"], ["video games", "cooking", "hiking", "podcasts", "startups"], ["growth", "family", "curiosity"], [78, 70, 55, 75, 82], { skin: "medium", hair: "black", hairStyle: "long", eyes: "dark brown", shirt: "#8e44ad" }],
  ["Jake Sullivan", 34, "Reading", "Owns a landscaping company", "Two kids under 4. Run a crew of 12. Backyard is basically a BBQ restaurant on weekends.", ["married", "young kids", "small business owner"], ["grilling", "fishing", "Red Sox", "craft beer", "DIY"], ["hard work", "family", "community"], [45, 80, 72, 68, 78], { skin: "light", hair: "light brown", hairStyle: "short", eyes: "green", shirt: "#27ae60" }],
  ["Danielle Okafor", 29, "Medford", "Nurse practitioner", "Recently engaged. Run club regular. Looking for couples to do trivia nights with.", ["engaged"], ["running", "trivia", "craft beer", "travel", "reading"], ["kindness", "health", "adventure"], [70, 72, 80, 85, 65], { skin: "deep", hair: "black", hairStyle: "curly", eyes: "dark brown", shirt: "#e67e22" }],
  ["Tom Becker", 33, "Lynnfield", "Co-founder, e-commerce brand", "We sell outdoor gear online. Wife is due in May with our first. Steam library is embarrassing.", ["married", "expecting", "founder"], ["video games", "camping", "grilling", "startups", "Celtics"], ["ambition", "freedom", "family"], [72, 66, 58, 64, 92], { skin: "fair", hair: "blonde", hairStyle: "short", eyes: "blue", glasses: true, shirt: "#16a085" }],
  ["Carlos Mendes", 31, "Saugus", "Electrician, own shop", "Newborn son at home. Grew up in Brazil, grill like it. Pick-up soccer on Sundays.", ["married", "new parent", "small business owner"], ["grilling", "soccer", "cooking", "music", "cars"], ["family", "hard work", "joy"], [60, 70, 82, 80, 75], { skin: "tan", hair: "dark brown", hairStyle: "short", eyes: "brown", shirt: "#f1c40f" }],
  ["Emily Chen", 27, "Cambridge", "PhD student, robotics", "Board game hoarder. Single and new to Boston, trying to build a crew outside the lab.", ["single", "student", "new to area"], ["board games", "video games", "climbing", "coffee", "reading"], ["curiosity", "honesty", "growth"], [90, 64, 45, 70, 80], { skin: "porcelain", hair: "black", hairStyle: "bun", eyes: "dark brown", glasses: true, shirt: "#2980b9" }],
  ["Ryan Walsh", 36, "Stoneham", "Sales director", "Three kids, coach every one of their teams. Golf when the wife allows it.", ["married", "young kids", "corporate"], ["golf", "Bruins", "grilling", "craft beer", "coaching"], ["family", "competition", "loyalty"], [48, 66, 85, 72, 70], { skin: "fair", hair: "dark brown", hairStyle: "short", eyes: "hazel", shirt: "#34495e" }],
  ["Aisha Brooks", 41, "Salem", "Runs a bakery", "Teenagers at home, so I finally have time again. Love hosting dinner parties.", ["married", "teens", "small business owner"], ["baking", "wine", "gardening", "reading", "yoga"], ["community", "generosity", "craft"], [74, 78, 68, 88, 66], { skin: "deep", hair: "black", hairStyle: "bun", eyes: "brown", shirt: "#d35400" }],
  ["Nate Kowalski", 30, "Woburn", "Software engineer (remote)", "Remote dev, partner and I are expecting twins (!). Building a gaming PC for the nursery, kidding. Mostly.", ["married", "expecting", "remote worker"], ["video games", "tech", "craft beer", "hiking", "board games"], ["curiosity", "family", "humor"], [80, 60, 48, 78, 70], { skin: "light", hair: "red", hairStyle: "curly", eyes: "green", shirt: "#7f8c8d" }],
  ["Grace Lindqvist", 64, "Marblehead", "Retired teacher", "Sail every summer. Grandkids visit on weekends. I play a mean game of cribbage.", ["retired", "grandparent"], ["boating", "reading", "gardening", "board games", "travel"], ["kindness", "learning", "community"], [70, 75, 60, 90, 40], { skin: "porcelain", hair: "white", hairStyle: "short", eyes: "blue", glasses: true, shirt: "#5dade2" }],
  ["Marcus Hill", 32, "Malden", "Founder, fitness studio", "Opened my second location this year. Baby girl arrived 3 months ago. Always down for a lift + beer.", ["married", "new parent", "founder"], ["lifting", "craft beer", "basketball", "startups", "music"], ["discipline", "ambition", "family"], [58, 88, 78, 72, 95], { skin: "deep", hair: "black", hairStyle: "short", eyes: "dark brown", shirt: "#e74c3c" }],
  ["Sophie Martin", 25, "Somerville", "Graphic designer", "Indie shows, thrift stores, and way too many houseplants.", ["single"], ["music", "art", "coffee", "photography", "thrifting"], ["creativity", "authenticity", "freedom"], [92, 50, 62, 74, 55], { skin: "light", hair: "auburn", hairStyle: "long", eyes: "hazel", shirt: "#a569bd" }],
  ["Dave O'Brien", 38, "Peabody", "Firefighter", "Two boys, one dog, one very full smoker. Ask me about my brisket.", ["married", "young kids"], ["grilling", "fishing", "Patriots", "DIY", "camping"], ["service", "family", "loyalty"], [44, 72, 70, 82, 52], { skin: "fair", hair: "gray", hairStyle: "short", eyes: "blue", shirt: "#922b21" }],
  ["Hannah Weiss", 31, "Winchester", "VC associate", "Due in April with our first. I spend all day with founders and want friends who get the grind.", ["married", "expecting", "corporate"], ["startups", "running", "wine", "podcasts", "travel"], ["ambition", "growth", "family"], [76, 82, 66, 66, 90], { skin: "fair", hair: "blonde", hairStyle: "ponytail", eyes: "blue", shirt: "#1abc9c" }],
  ["Luis Garcia", 34, "Lynn", "Restaurant owner", "Taqueria owner, one toddler. Weekends are chaos, Monday nights are sacred: video games.", ["married", "young kids", "small business owner"], ["cooking", "video games", "soccer", "craft beer", "music"], ["family", "hard work", "community"], [66, 70, 76, 80, 80], { skin: "tan", hair: "black", hairStyle: "spiky", eyes: "brown", shirt: "#f39c12" }],
  ["Ben Foster", 29, "Beverly", "Physical therapist", "Married last year. Trail runner. We're 'thinking about kids' which means we bought a bigger car.", ["married"], ["running", "hiking", "skiing", "coffee", "craft beer"], ["health", "adventure", "honesty"], [72, 74, 64, 82, 60], { skin: "light", hair: "light brown", hairStyle: "short", eyes: "green", shirt: "#2ecc71" }],
  ["Kim Tran", 35, "Quincy", "Accountant, own practice", "Single mom of a 6-year-old. Pickleball fanatic. Tax season survivor.", ["single parent", "young kids", "small business owner"], ["pickleball", "cooking", "reading", "travel", "podcasts"], ["resilience", "family", "independence"], [60, 86, 60, 76, 74], { skin: "light", hair: "black", hairStyle: "long", eyes: "dark brown", glasses: true, shirt: "#ec7063" }],
  ["Owen Pierce", 45, "Andover", "CFO at a biotech", "Kids are teens, so my weekends are golf and driving to hockey rinks.", ["married", "teens", "corporate"], ["golf", "Bruins", "wine", "investing", "skiing"], ["achievement", "family", "stability"], [52, 84, 58, 62, 85], { skin: "fair", hair: "gray", hairStyle: "short", eyes: "gray", shirt: "#283747" }],
  ["Zoe Adams", 28, "Brookline", "Med resident", "Work 80 hours a week, so friends need to be OK with last-minute brunch.", ["dating"], ["yoga", "coffee", "travel", "reading", "music"], ["compassion", "growth", "balance"], [80, 76, 58, 84, 76], { skin: "medium", hair: "brown", hairStyle: "pigtails", eyes: "brown", shirt: "#48c9b0" }],
  ["Chris Nguyen", 33, "Burlington", "Founder, AI dev tools", "Raised a seed round this summer. Expecting a son in February. Smash Bros. champion of my old dorm.", ["married", "expecting", "founder"], ["video games", "startups", "tech", "basketball", "craft beer"], ["ambition", "curiosity", "family"], [84, 64, 62, 66, 96], { skin: "light", hair: "black", hairStyle: "spiky", eyes: "dark brown", shirt: "#3498db" }],
  ["Megan Riley", 37, "Danvers", "Real estate agent", "Two kids, PTA president, will absolutely organize your neighborhood block party.", ["married", "young kids"], ["wine", "pickleball", "Patriots", "cooking", "travel"], ["community", "family", "fun"], [56, 70, 92, 80, 68], { skin: "fair", hair: "blonde", hairStyle: "bun", eyes: "blue", shirt: "#ff6f91" }],
  ["Sam Oyelaran", 30, "Arlington", "Data scientist", "Newly married, homebrewer, Catan strategist. Looking for a regular game night.", ["married"], ["craft beer", "board games", "video games", "cycling", "cooking"], ["curiosity", "humor", "loyalty"], [82, 68, 52, 78, 64], { skin: "deep", hair: "black", hairStyle: "short", eyes: "brown", glasses: true, shirt: "#5d6d7e" }],
  ["Jess Morales", 32, "Melrose", "Owns a marketing agency", "Expecting my first in spring, husband is a chef so our grill nights are elite.", ["married", "expecting", "founder"], ["grilling", "wine", "running", "startups", "music"], ["ambition", "creativity", "family"], [76, 72, 80, 74, 88], { skin: "tan", hair: "dark brown", hairStyle: "long", eyes: "hazel", shirt: "#c39bd3" }],
  ["Pete Hanlon", 52, "Newburyport", "Charter boat captain", "Empty nester. Know every striper spot from here to Maine.", ["married", "empty nester", "small business owner"], ["fishing", "boating", "craft beer", "Red Sox", "cooking"], ["freedom", "honesty", "nature"], [50, 60, 70, 76, 50], { skin: "tan", hair: "white", hairStyle: "short", eyes: "blue", shirt: "#1f618d" }],
  ["Alex Ivanov", 31, "Waltham", "Engineer at a robotics company", "Single, just moved from Chicago. Climbing gym, ramen hunting, co-op games.", ["single", "new to area", "corporate"], ["climbing", "video games", "cooking", "hiking", "tech"], ["curiosity", "adventure", "honesty"], [78, 66, 50, 70, 72], { skin: "porcelain", hair: "light brown", hairStyle: "curly", eyes: "gray", shirt: "#45b39d" }],
  ["Rachel Goldberg", 33, "Swampscott", "Pediatric dentist, own practice", "Baby #1 arrived in the summer. Former college rower, current sleep-deprived human.", ["married", "new parent", "small business owner"], ["running", "beach", "cooking", "reading", "wine"], ["family", "health", "ambition"], [68, 86, 62, 80, 82], { skin: "light", hair: "brown", hairStyle: "long", eyes: "brown", shirt: "#f5b041" }],
  ["Jordan Price", 31, "North Reading", "Founder, construction tech", "Wife is due in January. I've got a pellet smoker, a PS5, and zero free time. Let's fix that.", ["married", "expecting", "founder"], ["grilling", "video games", "craft beer", "Celtics", "golf"], ["ambition", "family", "humor"], [64, 72, 70, 74, 93], { skin: "medium", hair: "dark brown", hairStyle: "short", eyes: "brown", shirt: "#d4ac0d" }],
];


const GIRLS = new Set(["Priya", "Danielle", "Emily", "Aisha", "Grace", "Sophie", "Hannah", "Kim", "Zoe", "Megan", "Jess", "Rachel"]);

export const POPULATION: Townsperson[] = SEEDS.map(
  ([name, age, town, occupation, bio, lifeStageTags, interests, values, t, look], i) => {
    const first = name.split(" ")[0].toLowerCase();
    return {
      id: `p${i}`,
      name,
      gender: GIRLS.has(name.split(" ")[0]) ? "girl" : "guy",
      age,
      town,
      occupation,
      bio,
      lifeStageTags,
      interests,
      values,
      traits: { openness: t[0], conscientiousness: t[1], extraversion: t[2], agreeableness: t[3], ambition: t[4] },
      look: {
        eyes: "brown",
        glasses: false,
        shirt: SHIRTS[i % SHIRTS.length],
        pants: PANTS[i % PANTS.length],
        ...look,
      },
      lat: townCoords(town)?.[0],
      lng: townCoords(town)?.[1],
      contact: {
        email: `${first}.${name.split(" ")[1].toLowerCase().replace(/'/g, "")}@example.com`,
        phone: `(781) 555-${String(1000 + i * 37).slice(-4)}`,
        instagram: `@${first}${i % 3 === 0 ? "_north" : i % 3 === 1 ? ".grills" : "ma"}`,
      },
    };
  },
);
