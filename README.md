# Whirly Word

An android implementation of the classic Whirly Word SE for iPhone. Six letters arranged on a wheel — find every English word you can make from them. When you've found enough words you can move on to a new puzzle.

## How to play

Tap letters on the wheel to spell a word. Tap **Enter** to submit. Each letter on the wheel can only be used once per word (so no doubling up unless the source word contains the letter twice). The answer panel shows blanks for every valid word, grouped by length, filling in as you find them.

Keyboard shortcuts (desktop): type letters, **Enter** to submit, **Backspace** to undo, **Esc** to clear.

## Tweaking the dictionary

`words.js` exports `window.WORDS` (a `Set` of valid words, length 3–6) and `window.SOURCE_WORDS` (an array of 6-letter "puzzle" words). The game picks a source word at random, finds every valid sub-anagram in `WORDS`, and that's your puzzle.

To use a bigger dictionary, drop in any word list you trust (3–6 letter words, uppercase). For example, the [dwyl/english-words](https://github.com/dwyl/english-words) list is in the public domain and gives you ~10× the words. Pre-process it down to 3–6 letters and replace the `raw` array in `words.js`.

To bias the puzzle generator toward more interesting source words, edit `SOURCE_WORDS` — the game prefers entries from that list and falls back to scanning the dictionary if needed.
