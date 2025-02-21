let compendiumItems = null; // Cache for compendium items

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
    const data = await response.json();
    console.log("JSON data to import:", data.map(d => ({ _id: d._id, name: d.name })));
    await Item.createDocuments(data, { pack: packKey, keepId: true });
    await pack.getIndex({ force: true });
    console.log("Psionicist pack populated with data! Index size:", pack.index.size);
    console.log("Imported items:", pack.index.map(i => ({ _id: i._id, name: i.name })));
    compendiumItems = await pack.getDocuments(); // Cache all items
    console.log("Cached compendium items:", compendiumItems.map(i => i.name));
  } else {
    console.log("Compendium already populated. Index size:", pack.index.size);
    compendiumItems = await pack.getDocuments();
    console.log("Cached existing compendium items:", compendiumItems.map(i => i.name));
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

    const pack = game.packs.get("darksun-psionics.psionicist");
    await pack.getIndex({ force: true });
    console.log("Pack index in createItem:", pack.index.map(i => i.name));
    const subclasses = await pack.getDocuments();
    const subclassOptions = subclasses.filter(s => s.type === "subclass" && s.system.classIdentifier === "psionicist");
    if (!actor.items.find(i => i.type === "subclass" && i.system.classIdentifier === "psionicist")) {
      const choice = await new Promise(resolve => {
        new Dialog({
          title: "Choose Psionic Discipline",
          content: `
            <p>Select your Psionic Discipline:</p>
            <select id="subclass">
              ${subclassOptions.map(s => `<option value="${s._id}">${s.name}</option>`).join("")}
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
      const subclass = subclassOptions.find(s => s._id === choice);
      if (subclass) {
        await actor.createEmbeddedDocuments("Item", [subclass.toObject()]);
        console.log(`Added ${subclass.name} subclass to ${actor.name}`);
        const subclassItem = actor.items.getName(subclass.name);
        console.log("Subclass advancements:", subclassItem.system.advancement);
        const advancements = subclassItem.system.advancement.filter(a => a.type === "ItemGrant" && a.level <= level);
        console.log("Advancements to apply:", advancements);
        const itemsToGrant = advancements.flatMap(a => a.configuration.items);
        console.log("Items to grant:", itemsToGrant);
        if (itemsToGrant.length > 0) {
          let items = compendiumItems.filter(i => itemsToGrant.includes(i._id)); // Use cached items
          if (!items.length) {
            console.log("Cache missed, falling back to fetch...");
            items = [];
            for (const id of itemsToGrant) {
              const item = await pack.getDocument(id);
              if (item) items.push(item);
            }
          }
          console.log("Fetched/Cached items:", items.map(i => i.name));
          if (items.length > 0) {
            await actor.createEmbeddedDocuments("Item", items.map(i => i.toObject()));
            console.log(`Granted ${items.length} initial items for ${subclass.name}`);
          } else {
            console.log("No items fetched despite valid IDs.");
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
      console.log("Subclass advancements:", subclass.system.advancement);
      const advancements = subclass.system.advancement.filter(a => a.type === "ItemGrant" && a.level <= newLevel);
      console.log("Advancements to apply:", advancements);
      const itemsToGrant = advancements.flatMap(a => a.configuration.items);
      console.log("Items to grant:", itemsToGrant);
      const existingItems = actor.items.filter(i => i.type === "feat").map(i => i.flags.core?.sourceId || i._id);
      const itemsToAdd = itemsToGrant.filter(id => !existingItems.includes(`Compendium.darksun-psionics.psionicist.${id}`));
      console.log("Items to add (filtered):", itemsToAdd);
      if (itemsToAdd.length > 0) {
        const pack = game.packs.get("darksun-psionics.psionicist");
        await pack.getIndex({ force: true });
        console.log("Pack index in updateItem:", pack.index.map(i => i.name));
        let items = compendiumItems.filter(i => itemsToAdd.includes(i._id)); // Use cached items
        if (!items.length) {
          console.log("Cache missed, falling back to fetch...");
          items = [];
          for (const id of itemsToAdd) {
            const item = await pack.getDocument(id);
            if (item) items.push(item);
          }
        }
        console.log("Fetched/Cached items:", items.map(i => i.name));
        if (items.length > 0) {
          await actor.createEmbeddedDocuments("Item", items.map(i => i.toObject()));
          console.log(`Granted ${items.length} new items for ${subclass.name} up to level ${newLevel}`);
        } else {
          console.log("No items fetched despite valid IDs.");
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