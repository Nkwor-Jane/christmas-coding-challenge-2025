export function spokenCharacters(segments, throughIndex) {
  return segments
    .slice(0, throughIndex + 1)
    .reduce((total, segment) => total + segment.text.length, 0);
}

export function followingSegment(index, total) {
  const next = index + 1;
  return next < total ? next : null;
}
