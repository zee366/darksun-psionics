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
      if (actor.sheet) actor.sheet.render(true); // Ensure sheet updates
    }
  });
  
  Hooks.on("renderActorSheet", (sheet, html) => {
    if (sheet.constructor.name !== "ActorSheet5eCharacter") return; // Target Default sheet only
    const actor = sheet.actor;
    if (actor.classes.psionicist) {
      const powerPoints = actor.system.resources.primary;
      if (powerPoints.label === "Power Points") {
        // Find or create a resources section
        let resources = html.find(".resources");
        if (!resources.length) {
          resources = $('<div class="resources flexrow"></div>');
          // Insert into the attributes section (adjust selector as needed)
          const attributes = html.find(".attributes");
          if (attributes.length) {
            attributes.append(resources);
          } else {
            html.find(".center-pane").append(resources); // Fallback
          }
        }
        // Add Power Points display
        resources.html(`
          <div class="resource flex-group-center">
            <label>Power Points</label>
            <input type="text" value="${powerPoints.value}/${powerPoints.max}" readonly>
          </div>
        `);
      }
    }
  });