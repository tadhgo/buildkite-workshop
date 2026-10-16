export interface Profile {
  firstName: string;
  lastName: string;
}

export function displayName({ firstName, lastName }: Profile): string {
  const first = firstName.trim();
  const last = lastName.trim();
  if (!first || !last) {
    return first || last;
  }
  return `${first} ${last[0].toUpperCase()}.`;
}

export function initials({ firstName, lastName }: Profile): string {
  return [firstName, lastName]
    .map((part) => part.trim()[0] ?? "")
    .join("")
    .toUpperCase();
}
