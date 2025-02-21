Dark Sun Psionics

A Foundry Virtual Tabletop module that brings psionics from AD&D 2nd Edition’s Dark Sun setting to Dungeons & Dragons 5th Edition. This module introduces the Psionicist class (levels 1-20), a psionic power system using Psionic Strength Points (PSPs), and Wild Talents for non-Psionicist characters, fully integrated with the dnd5e system.

Features
Psionicist Class: A full 1-20 level progression with Disciplines (e.g., Telepathy, Psychokinesis) inspired by AD&D 2e, adapted for 5e mechanics.
Psionic Powers: A unique resource system using PSPs instead of spell slots, with powers like Mind Thrust and Psychic Domination.
Wild Talents: Optional psionic abilities for non-Psionicists, reflecting Dark Sun’s pervasive psionic flavor.
5e Integration: Seamlessly extends Foundry’s dnd5e system with custom character sheet fields and compendiums.

Installation
Manual Install:
Download the latest release (once available) or clone this repository:
text
Wrap
Copy
git clone https://github.com/<your-username>/darksun-psionics.git
Place the darksun-psionics folder in your Foundry Data/modules/ directory.
Foundry Setup:
Launch Foundry VTT, go to Game Systems, and ensure dnd5e is active.
In Manage Modules, enable Dark Sun Psionics.
Dependencies: Requires Foundry VTT v11+ and the dnd5e system v3.0+.
Usage
Psionicist Creation: In the character sheet, select “Psionicist” as a class and choose a Discipline. PSPs and powers appear under a new tab.
Powers: Add psionic powers from the compendium to your sheet; spend PSPs to manifest them in-game.
Wild Talents: Apply the “Wild Talent” feat to non-Psionicists for minor psionic abilities.
Note: Full documentation pending completion of core features.

Development
Folder Structure
text
Wrap
Copy
darksun-psionics/
├── module.json          # Module manifest
├── scripts/            # JavaScript logic
│   ├── psionicist.js
│   ├── powers.js
│   ├── wildtalents.js
├── templates/          # Handlebars templates
│   ├── psionic-sheet.hbs
├── packs/             # Compendium data
│   ├── psionicist.json
│   ├── powers.json
│   ├── wildtalents.json
├── lang/              # Localization
│   ├── en.json
Contributing
Fork the repo, make changes, and submit a pull request.
Issues or feature suggestions? Open a ticket on GitHub.
Building
(TBD: Add build steps once tools like Webpack or npm are integrated.)
Credits
Inspired by AD&D 2nd Edition’s The Complete Psionics Handbook and the Dark Sun campaign setting.
Built for Foundry VTT’s dnd5e system.

License
GPL - feel free to use, modify, and distribute.