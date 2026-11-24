import assert from "node:assert/strict";
import { followingSegment, spokenCharacters } from "./playback.mjs";

const segments = [
  { text: "Alpha sentence." },
  { text: "Beta sentence." },
];

assert.equal(spokenCharacters(segments, 0), "Alpha sentence.".length);
assert.equal(followingSegment(0, 2), 1);
assert.equal(followingSegment(1, 2), null);
console.log("playback logic ok");
