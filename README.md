# Washington State Lottery — Number Generator & Saved Tickets Vault

A standalone, zero-dependency Washington's Lottery dashboard, multi-strategy number generator, draw checker, and persistent Saved Tickets Vault supporting all 7 major Washington State draw games.

## Supported Washington's Lottery Games

| Game | Matrix | Bonus Ball | Ticket Price | Draw Schedule | Top Prize / Jackpot |
| --- | --- | --- | --- | --- | --- |
| **WA Lotto** | Pick 6 from `1–49` | None | $1 for 2 plays | Mon, Wed, Sat · 8:00 PM PT | Rolling Jackpot ($1M+) |
| **Hit 5** | Pick 5 from `1–42` | None | $1 per play | Daily · 8:00 PM PT | Rolling Cashpot ($100K+) |
| **Match 4** | Pick 4 from `1–24` | None | $2 per play | Daily · 8:00 PM PT | $10,000 Top Prize |
| **Pick 3** | Pick 3 digits `0–9` | None (Exact / Box / Pair) | $0.50 or $1 | Daily · 8:00 PM PT | $500 ($1 Straight) |
| **Daily Keno** | Pick 10 spots from `1–80` (20 drawn) | None | $1 per play | Daily · 8:00 PM PT | Up to $500,000 |
| **Powerball** | Pick 5 from `1–69` | Powerball (`1–26`) | $2 per play | Mon, Wed, Sat · 7:59 PM PT | Rolling Giant Jackpot |
| **Mega Millions** | Pick 5 from `1–70` | Mega Ball (`1–24`) | $2 per play | Tue, Fri · 8:00 PM PT | Rolling Giant Jackpot |

## Key Features

- **Number Generator Studio**:
  - **5 Generation Modes**: `Quick Pick (Crypto RNG)` via `crypto.getRandomValues`, `Smart Balanced` (bell-curve sum + odd/even balance), `Hot Frequency`, `Cold / Overdue`, and `High Entropy (Anti-Crowd)`.
  - **Multi-Line Slip**: Generate `1–10` plays at once with live slip cost calculation.
  - **Lock Lucky Numbers**: Click any numbers in the interactive grid to lock your favorite numbers into every generated line.
  - **One-Click Save**: Save individual plays (`☆ Save Play`) or the entire slip (`💾 Save All Plays`) directly to your Saved Tickets Vault.
- **Custom Ticket Builder & Draw Checker**:
  - Enter your own numbers with range validation or use **Quick Fill**, add an optional label/note, check against the active draw + full draw history, and save to your Vault.
- **Saved Tickets Vault**:
  - Dual persistence in `localStorage` and `IndexedDB` (`wa-state-lottery-vault-db`).
  - Automatic prize tier verification (`verifyLineAgainstDraw`) against both the selected draw and all historical draws, with highlighted matching balls.
  - Filter by game (`Active Game Only` vs `All WA Games`) or status (`All Plays`, `🏆 Winners Only`, `★ Starred`).
  - Export and import your saved tickets as **JSON** or **CSV**.
- **Draw History & Frequency Heatmap**:
  - Visual ball frequency heatmap + searchable past drawings table. Click **Inspect Draw** on any past draw to check all saved tickets against that specific drawing.

## Run Locally

Open [`index.html`](./index.html) directly in any modern browser, or serve locally with Python:

```bash
python3 -m http.server 8080
```

Then visit `http://localhost:8080`.
