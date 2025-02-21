let psionicistData = null; // Cache JSON data

Hooks.once("ready", async () => {
  const packKey = "darksun-psionics.psionicist";
  let pack = game.packs.get(packKey);
  if (!pack) {
    pack = await CompendiumCollection.createCompendium({
      metadata: {
        id: packKey,
        label: "Psionicist Class",
        type: "Item",
        system: "dnd5e",
        module: "darksun-psionics"
      },
      path: "packs/psionicist"
    });
    console.log("Created compendium pack: darksun-psionics.psionicist");
  }
  if (pack && pack.index.size === 0) {
    const response = await fetch("./modules/darksun-psionics/packs/psionicist.json");
    if (!response.ok) {
      console.error("Failed to fetch psionicist.json:", response.statusText);
      return;
    }
    psionicistData = await response.json();
    console.log("Loaded psionicist.json data:", psionicistData.map(d => ({ _id: d._id, name: d.name })));
    await Item.createDocuments(psionicistData, { pack: packKey, keepId: true });
    console.log("Psionicist pack populated with data! Index size:", pack.index.size);
  } else {
    const response = await fetch("./modules/darksun-psionics/packs/psionicist.json");
    if (!response.ok) {
      console.error("Failed to fetch psionicist.json for cache:", response.statusText);
      return;
    }
    psionicistData = await response.json();
    console.log("Loaded psionicist.json data from populated compendium:", psionicistData.map(d => ({ _id: d._id, name: d.name })));
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
    console.log(`Set Power Points to ${powerPoints} for ${actor.name}`);

    if (!psionicistData) {
      console.error("psionicist.json data not loaded yet!");
      return;
    }
    const subclasses = psionicistData.filter(s => s.type === "subclass" && s.system.classIdentifier === "psionicist");
    if (!actor.items.find(i => i.type === "subclass" && i.system.classIdentifier === "psionicist")) {
      const choice = await new Promise(resolve => {
        new Dialog({
          title: "Choose Psionic Discipline",
          content: `
            <p>Select your Psionic Discipline:</p>
            <select id="subclass">
              ${subclasses.map(s => `<option value="${s._id}">${s.name}</option>`).join("")}
            </select>
          `,
          buttons: {
            ok: {
              label: "Confirm",
              callback: html => resolve(html.find("#subclass").val())
            }
          }
        }).render(true);
      });
      const subclass = subclasses.find(s => s._id === choice);
      if (subclass) {
        await actor.createEmbeddedDocuments("Item", [subclass]);
        console.log(`Added ${subclass.name} subclass to ${actor.name}`);
        const subclassItem = actor.items.getName(subclass.name);
        console.log("Subclass advancements:", JSON.stringify(subclassItem.system.advancement, null, 2));
        const advancements = subclassItem.system.advancement.filter(a => a.type === "ItemGrant" && a.level <= level);
        console.log("Advancements to apply:", JSON.stringify(advancements, null, 2));
        const itemsToGrant = advancements.flatMap(a => a.configuration.items);
        console.log("Items to grant:", itemsToGrant);
        if (itemsToGrant.length > 0) {
          const items = psionicistData.filter(i => itemsToGrant.some(id => id === i._id));
          console.log("Items from JSON (raw IDs):", items.map(i => ({ _id: i._id, name: i.name })));
          if (items.length > 0) {
            await actor.createEmbeddedDocuments("Item", items);
            console.log(`Granted ${items.length} initial items for ${subclass.name}`);
          } else {
            console.log("No items found in JSON data for granted IDs:", itemsToGrant);
            console.log("Full psionicistData IDs:", psionicistData.map(d => d._id));
          }
        } else {
          console.log("No initial items found to grant.");
        }
      }
    }
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
    console.log(`Updated Power Points max to ${powerPoints} for ${actor.name} at level ${newLevel}`);

    const subclass = actor.items.find(i => i.type === "subclass" && i.system.classIdentifier === "psionicist");
    if (subclass) {
      console.log("Subclass advancements:", JSON.stringify(subclass.system.advancement, null, 2));
      const advancements = subclass.system.advancement.filter(a => a.type === "ItemGrant" && a.level <= newLevel);
      console.log("Advancements to apply:", JSON.stringify(advancements, null, 2));
      const itemsToGrant = advancements.flatMap(a => a.configuration.items);
      console.log("Items to grant:", itemsToGrant);
      const existingItems = actor.items.filter(i => i.type === "feat").map(i => i._id);
      const itemsToAdd = itemsToGrant.filter(id => !existingItems.includes(id));
      console.log("Items to add (filtered):", itemsToAdd);
      if (itemsToAdd.length > 0) {
        const items = psionicistData.filter(i => itemsToAdd.some(id => id === i._id));
        console.log("Items from JSON (raw IDs):", items.map(i => ({ _id: i._id, name: i.name })));
        if (items.length > 0) {
          await actor.createEmbeddedDocuments("Item", items);
          console.log(`Granted ${items.length} new items for ${subclass.name} up to level ${newLevel}`);
        } else {
          console.log("No items found in JSON data for granted IDs:", itemsToAdd);
          console.log("Full psionicistData IDs:", psionicistData.map(d => d._id));
        }
      } else {
        console.log(`No new items to grant for ${subclass.name} at level ${newLevel}`);
      }
    }
    if (actor.sheet) actor.sheet.render(true);
  }
});

Hooks.on("renderActorSheet", (sheet, html) => {
  if (sheet.constructor.name !== "ActorSheet5eCharacter") return;
  const actor = sheet.actor;
  if (actor.classes.psionicist) {
    const powerPoints = actor.system.resources.primary;
    if (powerPoints.label === "Power Points") {
      let resources = html.find(".resources");
      if (!resources.length) {
        resources = $('<div class="resources flexrow"></div>');
        const attributes = html.find(".attributes");
        if (attributes.length) {
          attributes.append(resources);
        } else {
          html.find(".center-pane").append(resources);
        }
      }
      resources.html(`
        <div class="resource flex-group-center">
          <label>Power Points</label>
          <input type="text" value="${powerPoints.value}/${powerPoints.max}" readonly>
        </div>
      `);

      const subclass = actor.items.find(i => i.type === "subclass" && i.system.classIdentifier === "psionicist");
      if (subclass) {
        html.find(".class .item-name h4").append(` (${subclass.name})`);
      }
    }
  }
});