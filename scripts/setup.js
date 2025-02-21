Hooks.once("ready", async () => {
    // Check if the compendium exists
    let pack = game.packs.get("darksun-psionics.psionicist");
  
    if (!pack) {
      // Create the compendium if it doesn’t exist
      pack = await CompendiumCollection.createCompendium({
        metadata: {
          id: "darksun-psionics.psionicist",
          label: "Psionicist Class",
          type: "Item",
          system: "dnd5e",
          module: "darksun-psionics"
        },
        path: "./packs/psionicist"
      });
      console.log("Created compendium pack: darksun-psionics.psionicist");
    }
  
    // Check if the pack is empty and populate it
    if (pack && pack.index.size === 0) {
      const response = await fetch("./modules/darksun-psionics/packs/psionicist.json");
      if (!response.ok) {
        console.error("Failed to fetch psionicist.json:", response.statusText);
        return;
      }
      const data = await response.json();
      await Item.createDocuments(data, { pack: "darksun-psionics.psionicist" });
      console.log("Psionicist pack populated with data!");
    } else {
      console.log("Psionicist pack already exists and has data.");
    }
  });