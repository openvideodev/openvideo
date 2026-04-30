import { nanoid } from "nanoid";

// Function to generate an ID with the first character as a letter
export function generateId(length: number = 16): string {
  const letters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"; // Allowed letters

  // Generate the first character
  const firstChar = letters.charAt(Math.floor(Math.random() * letters.length));

  // Generate the rest of the ID
  let restOfId = nanoid(length - 1);

  // Ensure the rest of the ID contains only allowed characters
  restOfId = restOfId.replace(/[^a-zA-Z0-9]/g, "").slice(0, length - 1); // Adjust length if necessary

  return firstChar + restOfId; // Concatenate the first character with the rest
}
