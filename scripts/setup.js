Hooks.once("init", async () => {
    const pack = game.packs.get("darksun-psionics.psionicist");
    if (!pack || pack.size === 0) {
      const response = await fetch("./modules/darksun-psionics/packs/psionicist.json");
      const data = await response.json();
      await Item.createDocuments(data, { pack: "darksun-psionics.psionicist" });
      console.log("Psionicist pack initialized!");
    }
  });