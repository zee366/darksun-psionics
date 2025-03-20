// sheets/PsionicistSheet.js
class PsionicistSheet extends dnd5e.applications.actor.ActorSheet5eCharacter2 {
  constructor(...args) {
    super(...args);
    this._filters = foundry.utils.mergeObject(this._filters || {}, {
      powerbook: { name: "", properties: new Set() }
    });
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dnd5e2", "sheet", "actor", "character", "vertical-tabs"],
      template: "modules/darksun-psionics/templates/actors/psionicist-character-sheet.hbs",
      width: 800,
      height: 1000,
      tabs: [{
        navSelector: ".tabs",
        contentSelector: ".tab-body",
        initial: "details"
      }]
    });
  }

  get template() {
    return "modules/darksun-psionics/templates/actors/psionicist-character-sheet.hbs";
  }

  static TABS = [
    { tab: "details", label: "DND5E.Details", icon: "fas fa-cog" },
    { tab: "inventory", label: "DND5E.Inventory", svg: "backpack" },
    { tab: "features", label: "DND5E.Features", icon: "fas fa-list" },
    { tab: "spells", label: "TYPES.Item.spellPl", icon: "fas fa-book" },
    { tab: "effects", label: "DND5E.Effects", icon: "fas fa-bolt" },
    { tab: "biography", label: "DND5E.Biography", icon: "fas fa-feather" },
    { tab: "bastion", label: "DND5E.Bastion.Label", icon: "fas fa-chess-rook" },
    { tab: "special-traits", label: "DND5E.SpecialTraits", icon: "fas fa-star" }
  ];

  async getData(options) {
    const data = await super.getData(options);

    if (!data.tabs || !Array.isArray(data.tabs)) {
      data.tabs = foundry.utils.deepClone(this.options.tabs);
    }
    if (!data.tabs[0].tabs) {
      data.tabs[0].tabs = this.constructor.TABS.map(t => ({
        id: t.tab,
        label: game.i18n.localize(t.label),
        icon: t.icon || undefined,
        svg: t.svg || undefined
      }));
    }

    const isPsionicist = data.actor.items.some(
      (item) => item.type === "class" && item.name === "Psionicist"
    );

    if (isPsionicist) {
      const tabs = this.constructor.TABS.slice();
      const spellIndex = tabs.findIndex(t => t.tab === "spells");
      if (spellIndex !== -1) {
        tabs[spellIndex] = { tab: "powers", label: "DSPSIONICS.Powers", icon: "fas fa-brain" };
      }
      data.tabs[0].tabs = tabs.map(t => ({
        id: t.tab,
        label: game.i18n.localize(t.label),
        icon: t.icon || undefined,
        svg: t.svg || undefined,
        tooltip: t.tab === "powers" ? "Powers" : game.i18n.localize(t.label)
      }));
      this.options.tabs[0].tabs = data.tabs[0].tabs;

      const powers = data.actor.items
        .filter(item => item?.type === "darksun-psionics.power" && item?.name && typeof item.name === "string");
      data.powers = [{
        label: "DSPSIONICS.Powers",
        items: powers,
        dataset: { type: "power" }
      }];
      data.collections = data.collections || {};
      data.collections.powerbook = powers;

      // data.inventory = data.inventory || [];
      // data.inventory.push({
      //   label: "DSPSIONICS.Powers",
      //   items: powers,
      //   dataset: { type: "power" }
      // });
    }

    return data;
  }

  async _render(force = false, options = {}) {
    await super._render(force, options);
    const html = this.element;
    const sidebarNav = html.find("nav.tabs-right");
    if (this.actor.items.some(item => item.type === "class" && item.name === "Psionicist")) {
      // TODO: do not replace spells tab, create a new one
      const spellsTab = sidebarNav.find('a[data-tab="spells"]');
      if (spellsTab.length) {
        spellsTab.attr("data-tab", "powers");
        spellsTab.attr("data-tooltip", "Powers");
        spellsTab.find("i").removeClass("fas fa-book").addClass("fas fa-brain");
      }
    }

    const powersList = html.find('.powers-list');
    if (powersList.length) {
      console.log("[PsionicistSheet] Powers List HTML After Render:", powersList.html());
      const inventoryElement = html.find('dnd5e-inventory[data-collection="powerbook"]')[0];
      if (inventoryElement && this._filters.powerbook) {
        inventoryElement._applyFilters(this._filters.powerbook);
      }
    }
  }

  activateListeners(html) {
    super.activateListeners(html);
    this._tabs?.forEach(tabGroup => tabGroup.bind(html[0]));

    // Edit and delete controls (handled by <dnd5e-inventory>)
    html.find('.item-control[data-action="edit"]').click(event => {
      const itemId = event.currentTarget.closest('[data-item-id]').dataset.itemId;
      const item = this.actor.items.get(itemId);
      if (item) item.sheet.render(true);
    });

    html.find('.item-control[data-action="delete"]').click(event => {
      const itemId = event.currentTarget.closest('[data-item-id]').dataset.itemId;
      if (itemId) this.actor.deleteEmbeddedDocuments("Item", [itemId]);
    });
  }

  _filterItems(items, filters, collection) {
    console.log("[PsionicistSheet] Filter Called - Collection:", collection, "Filters:", filters, "Search:", this._filters.powerbook.name);
    if (collection !== "powerbook") return items;
    const powers = this.actor.items
      .filter(item => item?.type === "darksun-psionics.power" && item?.name && typeof item.name === "string");
    const searchTerm = this._filters.powerbook.name?.toLowerCase() || "";
    const filtered = powers.filter(item => {
      const nameMatch = !searchTerm || item.name.toLowerCase().includes(searchTerm);
      const propMatch = !filters?.size || Array.from(filters).every(filter => {
        switch (filter) {
          case "action": return item.system.activation?.type === "action";
          case "bonus": return item.system.activation?.type === "bonus";
          case "reaction": return item.system.activation?.type === "reaction";
          default: return true;
        }
      });
      console.log("[PsionicistSheet] Item:", item.name, "Name Match:", nameMatch, "Prop Match:", propMatch);
      return nameMatch && propMatch;
    });
    return filtered;
  }
}

Actors.registerSheet("dnd5e", PsionicistSheet, {
  types: ["character"],
  makeDefault: false,
  label: "Dark Sun Psionicist Sheet"
});