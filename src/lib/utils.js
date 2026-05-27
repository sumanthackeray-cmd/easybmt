import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}


export const isIframe = window.self !== window.top;

export function getFirstName(fullName) {
  if (!fullName) return "User";
  const parts = fullName.split(" ").filter(Boolean);
  if (parts.length === 0) return "User";
  const titles = ["mr", "mr.", "mrs", "mrs.", "ms", "ms.", "dr", "dr.", "prof", "prof.", "shri", "smt"];
  if (parts.length > 1 && titles.includes(parts[0].toLowerCase())) {
    return parts[1];
  }
  return parts[0];
}

export function getAvatarLetter(fullName) {
  const firstName = getFirstName(fullName);
  return firstName.charAt(0).toUpperCase() || "U";
}
