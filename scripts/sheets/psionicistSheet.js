// sheets/PsionicistSheet.js
class PsionicistSheet extends dnd5e.applications.actor.ActorSheet5eCharacter2 {
    /** @override */
    static get defaultOptions() {
      return foundry.utils.mergeObject(super.defaultOptions, {
        classes: ["dnd5e2", "sheet", "actor", "character", "vertical-tabs"],
        template: "modules/darksun-psionics/templates/actors/psionicist-character-sheet.hbs",
        width: 800,
        height: 1000,
        tabs: [{ navSelector: ".tabs", contentSelector: ".tab-body", initial: "details" }]
      });
    }
  
    /** @override */
    async getData(options) {
      const data = await super.getData(options);
  
      // Check if the character has a "Psionicist" class
      const isPsionicist = data.actor.items.some(
        (item) => item.type === "class" && item.name === "Psionicist"
      );
  
      // Replace "Spells" tab with "Powers" if Psionicist
      if (isPsionicist) {
        const tabs = data.tabs || [];
        const spellTabIndex = tabs.findIndex((tab) => tab.nav === "spells");
        if (spellTabIndex !== -1) {
          tabs[spellTabIndex] = {
            nav: "powers",
            content: "powers",
            label: "Powers",
            icon: "fas fa-brain" // Optional: Use a different icon
          };
        }
      }
  
      return data;
    }
  
    /** @override */
    activateListeners(html) {
      super.activateListeners(html);
      // Add any custom listeners for the powers tab if needed
    }
}