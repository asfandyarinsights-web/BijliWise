// Tiny non-React switch so api.js knows which mode it is in. The React provider keeps it in sync.
// Stored in sessionStorage: a reload keeps the visitor in Demo Mode, closing the tab leaves it.
const KEY = "bijliwise:demo-mode";

function readStored() {
  try {
    return sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

let active = readStored();

export const isDemoActive = () => active;

export function setDemoActive(value) {
  active = Boolean(value);
  try {
    if (active) sessionStorage.setItem(KEY, "1");
    else sessionStorage.removeItem(KEY);
  } catch {
    // Storage unavailable: the in-memory flag still works for this page load.
  }
}
