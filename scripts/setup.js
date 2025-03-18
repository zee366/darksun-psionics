// modules/darksun-psionics/setup.js
Hooks.once("init", async () => {
  console.log("[DarkSunPsionics] Initializing module...");

  // Register the 'find' Handlebars helper
  Handlebars.registerHelper("find", function (array, key1, value1, key2, value2) {
    if (!Array.isArray(array)) return false;
    return array.some(item => item[key1] === value1 && item[key2] === value2);
  });

  // Preload Handlebars templates
  await preloadHandlebarsTemplates();

  console.log("[DarkSunPsionics] Module initialization complete.");
});

async function preloadHandlebarsTemplates() {
  const partials = [
    "modules/darksun-psionics/templates/actors/tabs/creature-powers.hbs"
  ];

  const paths = {};
  for (const path of partials) {
    // Map both full path and scoped name
    paths[path.replace(".hbs", ".html")] = path; // Foundry sometimes uses .html extension internally
    paths[`darksun-psionics.${path.split("/").pop().replace(".hbs", "")}`] = path; // e.g., darksun-psionics.creature-powers
  }
  return loadTemplates(paths);
}

Hooks.once("ready", async () => {
  if (!game.user.isGM) {
    console.log("[Dark Sun] Skipping compendium population - not GM.");
    return;
  }

  // Define the new "darksun-psionics.power" item type
  CONFIG.Item.documentClass.TYPES.push("darksun-psionics.power");
  CONFIG.Item.dataModels["darksun-psionics.power"] = class PowerData extends foundry.abstract.DataModel {
    static defineSchema() {
      const fields = foundry.data.fields;
      return {
        description: new fields.HTMLField({ required: true, blank: true }),
        level: new fields.NumberField({ required: true, initial: 0, integer: true }),
        activation: new fields.SchemaField({
          type: new fields.StringField({ initial: "action" }),
          cost: new fields.NumberField({ required: true, initial: 1, integer: true })
        }),
        duration: new fields.SchemaField({
          value: new fields.NumberField({ initial: 1, integer: true }),
          units: new fields.StringField({ initial: "minute" })
        }),
        range: new fields.SchemaField({
          value: new fields.NumberField({ initial: 30, integer: true }),
          units: new fields.StringField({ initial: "ft" })
        }),
        preparation: new fields.SchemaField({
          mode: new fields.StringField({ initial: "innate" })
        }),
        actionType: new fields.StringField({ initial: "utility" }),
        target: new fields.SchemaField({
          value: new fields.NumberField({ initial: 1, integer: true }),
          type: new fields.StringField({ initial: "creature" })
        }),
        powerCost: new fields.NumberField({ required: true, initial: 1, min: 0, integer: true }),
        damage: new fields.ArrayField(
          new fields.ArrayField(new fields.StringField())
        ),
        source: new fields.StringField({ initial: "Psionicist Powers" })
      };
    }
  };

  // Optionally, register a custom sheet for powers
  Items.registerSheet("dnd5e", class PowerSheet extends ItemSheet {
    get template() {
      return `/modules/darksun-psionics/templates/power-sheet.hbs`;
    }
  }, { types: ["darksun-psionics.power"], label: "Power Sheet" });

  const packs = [
    { key: "darksun-psionics.psionicist", path: "packs/psionicist.json" },
    { key: "darksun-psionics.subclasses", path: "packs/psionicistsubclasses.json" },
    { key: "darksun-psionics.features", path: "packs/psionicistfeatures.json" },
    { key: "darksun-psionics.powers", path: "packs/powers.json" }
  ];

  for (const { key, path } of packs) {
    const pack = game.packs.get(key);
    if (!pack) {
      console.error(`[Dark Sun] Pack ${key} not found in game.packs! Check module.json or file placement.`);
      continue;
    }
    if (pack.index.size === 0) {
      if (pack.locked) {
        await pack.configure({ locked: false });
      }
      const response = await fetch(`./modules/darksun-psionics/${path}`);
      if (!response.ok) {
        continue;
      }
      const data = await response.json();
      await Item.createDocuments(data, { pack: key, keepId: true });
      await pack.getIndex({ force: true });
      await pack.configure({ locked: true });
    }
  }
});

Hooks.on("createItem", async (item, options, userId) => {
  if (item.type === "class" && item.name === "Psionicist" && item.parent) {
    const actor = item.parent;
    const level = item.system.levels || 1;
    const powerPoints = item.system.advancement.find(a => a.type === "Resource")?.configuration.value[level] || 2;
    await actor.update({
      "system.resources.primary": {
        label: "Power Points",
        value: powerPoints,
        max: powerPoints,
        sr: false,
        lr: false
      }
    });
    console.log(`[Dark Sun] Set Power Points to ${powerPoints} for ${actor.name}`);

    if (actor.sheet) actor.sheet.render(true);
  }
});

Hooks.on("updateItem", async (item, updateData, options, userId) => {
  if (item.type === "class" && item.name === "Psionicist" && item.parent && updateData.system?.levels) {
    const actor = item.parent;
    const newLevel = updateData.system.levels;
    const powerPoints = item.system.advancement.find(a => a.type === "Resource")?.configuration.value[newLevel] || 2;
    await actor.update({
      "system.resources.primary.max": powerPoints
    });

    const featurePack = game.packs.get("darksun-psionics.features");
    const subclass = actor.items.find(i => i.type === "subclass" && i.system.classIdentifier === "psionicist");
    if (subclass) {
      const advancements = subclass.system.advancement.filter(a => a.type === "ItemGrant" && a.level <= newLevel);
      const itemsToGrant = advancements.flatMap(a => a.configuration.items.map(item => item.uuid));
      const existingItems = actor.items
        .filter(i => i.type === "feat")
        .map(i => i.flags.core?.sourceId?.split(".").pop());
      
        const itemsToAdd = itemsToGrant.filter(id => !existingItems.includes(id));
      if (itemsToAdd.length > 0) {
        await featurePack.getIndex({ force: true });
        
        const items = [];
        for (const id of itemsToAdd) {
          const item = await featurePack.getDocument(id);
          if (item) {
            const itemData = item.toObject();
            itemData.flags = itemData.flags || {};
            itemData.flags.core = itemData.flags.core || {};
            itemData.flags.core.sourceId = `Compendium.darksun-psionics.features.${id}`;
            items.push(itemData);
          }
        }

        if (items.length > 0) {
          await actor.createEmbeddedDocuments("Item", items);
        }
      }
    }
    if (actor.sheet) actor.sheet.render(true);
  }
});

Hooks.on("renderActorSheet", (sheet, html) => {
  if (sheet.constructor.name !== "ActorSheet5eCharacter2" && sheet.constructor.name !== "PsionicistSheet") return;

  const actor = sheet.actor;
  if (!actor.classes.psionicist) return;

  const pp = actor.system.resources.primary;
  const pct = Math.round((pp.value / pp.max) * 100);

  const ppHtml = `
    <div class="meter-group">
      <div class="label roboto-condensed-upper">
        <span>Power Points</span>
      </div>
      <div class="meter sectioned power-points">
        <div class="progress power-points" role="meter" 
            aria-valuemin="0" aria-valuenow="${pp.value}" aria-valuemax="${pp.max}" 
            style="--bar-percentage: ${pct}%">
          <div class="label">
            <span class="value">${pp.value}</span>
            <span class="separator">/</span>
            <span class="max">${pp.max}</span>
          </div>
          <input type="text" name="actor.system.resources.primary.value" data-dtype="Number" 
                placeholder="0" value="${pp.value}" hidden>
        </div>
      </div>
    </div>
  `;

  const hpMeter = html.find(".meter-group:has(.hit-dice)");
  if (hpMeter.length) {
    hpMeter.after(ppHtml);
  }

  const subclass = actor.items.find(i => i.type === "subclass" && i.system.classIdentifier === "psionicist");
  if (subclass) {
    html.find(".class .item-name h4").append(` (${subclass.name})`);
  }
});

Hooks.on("preItemUse", (item, config, options) => {
  const actor = item.actor;
  if (!actor || actor.type !== "character") return true;

  const powerCost = item.system.powerCost || 0;
  if (powerCost > 0 && actor.classes?.psionicist) {
    const currentPoints = actor.system.resources.primary.value;
    if (currentPoints >= powerCost) {
      actor.update({ "system.resources.primary.value": currentPoints - powerCost });
      ui.notifications.info(`${actor.name} spends ${powerCost} Power Points to use ${item.name}.`);
      return true;
    } else {
      ui.notifications.warn(`${actor.name} does not have enough Power Points for ${item.name} (Cost: ${powerCost}).`);
      return false;
    }
  }
  return true;
});

Hooks.on("renderChatMessage", (message, html, data) => {
  if (message.item?.type === "darksun-psionics.power") {
    html.find(".card-content").append(`<p><strong>Power Cost:</strong> ${message.item.system.powerCost} PP</p>`);
  }
});