Hooks.once("ready", async () => {
    let pack = game.packs.get("darksun-psionics.psionicist");
    if (!pack) {
      pack = await CompendiumCollection.createCompendium({
        metadata: {
          id: "darksun-psionics.psionicist",
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
      await Item.createDocuments(data, { pack: "darksun-psionics.psionicist" });
      console.log("Psionicist pack populated with data!");
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
      if (actor.sheet) actor.sheet.render(true);
    }
  });
  
  Hooks.on("updateItem", async (item, updateData, options, userId) => {
    if (item.type === "class" && item.name === "Psionicist" && item.parent && updateData.system?.levels) {
      const actor = item.parent;
      const newLevel = updateData.system.levels;
      const powerPoints = item.system.advancement.find(a => a.type === "Resource")?.configuration.value[newLevel] || 2;
      await actor.update({
        "system.resources.primary.max": powerPoints,
      });
      console.log(`Updated Power Points to ${powerPoints} for ${actor.name} at level ${newLevel}`);
      if (actor.sheet) actor.sheet.render(true);
    }
  });
  
  Hooks.on("renderActorSheet", (sheet, html) => {
    if (sheet.constructor.name !== "ActorSheet5eCharacter") return; // Default sheet only
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
      }
    }
  });