const ASSET_NAMES = [
  "0", "1", "2", "3", "4", "5", "6", "7", "8", "9",
  "A", "After", "Again", "Against", "Age", "All", "Alone", "Also", "And", "Ask", "At",
  "B", "Be", "Beautiful", "Before", "Best", "Better", "Busy", "But", "Bye",
  "C", "Can", "Cannot", "Change", "College", "Come", "Computer",
  "D", "Day", "Distance", "Do", "Do Not", "Does Not",
  "E", "Eat", "Engineer",
  "F", "Fight", "Finish", "From",
  "G", "Glitter", "Go", "God", "Gold", "Good", "Great",
  "H", "Hand", "Hands", "Happy", "Hello", "Help", "Her", "Here", "His", "Home", "Homepage", "How",
  "I", "Invent", "It",
  "J",
  "K", "Keep",
  "L", "Language", "Laugh", "Learn",
  "M", "ME", "More", "My",
  "N", "Name", "Next", "Not", "Now",
  "O", "Of", "On", "Our", "Out",
  "P", "Pretty",
  "Q",
  "R", "Right",
  "S", "Sad", "Safe", "See", "Self", "Sign", "Sing", "So", "Sound", "Stay", "Study",
  "T", "Talk", "Television", "Thank", "Thank You", "That", "They", "This", "Those", "Time", "To", "Type",
  "U", "Us",
  "V",
  "W", "Walk", "Wash", "Way", "We", "Welcome", "What", "When", "Where", "Which", "Who", "Whole", "Whose", "Why", "Will", "With", "Without", "Words", "Work", "World", "Wrong",
  "X",
  "Y", "You", "Your", "Yourself",
  "Z",
];

const STOPWORDS = new Set([
  "a", "an", "am", "are", "as", "be", "been", "being", "did", "do", "does",
  "for", "has", "have", "i", "in", "is", "itself", "m", "of", "or", "re", "s",
  "she", "that", "the", "their", "them", "they're", "to", "was", "were", "you've",
]);

const LOOKUP = new Map(ASSET_NAMES.map((name) => [name.toLowerCase(), name]));
const PHRASE_OVERRIDES = new Map([
  ["me", "ME"],
  ["thank you", "Thank You"],
  ["do not", "Do Not"],
  ["does not", "Does Not"],
]);

const encodeAssetPath = (assetName) => `/sign-videos/${encodeURIComponent(assetName)}.mp4`;

const tokenize = (text) => text.match(/[A-Za-z0-9']+/g) || [];

const normalizeWord = (word) => word.toLowerCase();

const canonicalAsset = (fragment) => {
  if (!fragment) return null;
  const normalized = fragment.trim().toLowerCase();
  return PHRASE_OVERRIDES.get(normalized) || LOOKUP.get(normalized) || null;
};

const preprocessWords = (text) => {
  const tokens = tokenize(text);
  if (!tokens.length) return [];

  const lowered = tokens.map(normalizeWord);
  const result = [];

  const hasPast = lowered.some((word) =>
    word === "was"
    || word === "were"
    || word === "did"
    || word === "had"
    || (/^[a-z]{4,}ed$/.test(word) && !word.endsWith("eed")),
  );
  const hasFuture = lowered.includes("will");
  const hasContinuous = lowered.some((word) => word.endsWith("ing"));

  if (hasPast) result.push("Before");
  else if (hasFuture) result.push("Will");
  else if (hasContinuous) result.push("Now");

  for (const word of lowered) {
    if (word === "i") {
      result.push("ME");
      continue;
    }
    if (!STOPWORDS.has(word)) {
      result.push(word);
    }
  }

  return result.length ? result : lowered;
};

export function buildPlaybackSequence(text) {
  const words = preprocessWords(text);
  if (!words.length) return [];
  const items = [];

  for (let index = 0; index < words.length; index += 1) {
    const current = words[index];
    const next = words[index + 1];
    const bigram = next ? canonicalAsset(`${current} ${next}`) : null;

    if (bigram) {
      items.push({
        key: bigram.toLowerCase().replace(/\s+/g, "_"),
        label: bigram,
        assetName: bigram,
        videoPath: encodeAssetPath(bigram),
      });
      index += 1;
      continue;
    }

    const single = canonicalAsset(current);
    if (single) {
      items.push({
        key: single.toLowerCase().replace(/\s+/g, "_"),
        label: single,
        assetName: single,
        videoPath: encodeAssetPath(single),
      });
      continue;
    }

    current
      .replace(/[^a-z0-9]/gi, "")
      .split("")
      .forEach((char) => {
        const letter = canonicalAsset(char.toUpperCase());
        if (!letter) return;
        items.push({
          key: `letter_${letter.toLowerCase()}`,
          label: letter,
          assetName: letter,
          videoPath: encodeAssetPath(letter),
        });
      });
  }

  return items;
}
