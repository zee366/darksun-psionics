Hooks.once("init", async () => {
  // Define the new "power" item type
  console.log("[Dark Sun] Create power item type")
  CONFIG.Item.documentClass.types.add("power");
  CONFIG.Item.dataModels["power"] = class PowerData extends foundry.abstract.DataModel {
    static defineSchema() {
      const fields = foundry.data.fields;
      return {
        description: new fields.HTMLField({ required: true, blank: true }),
        activation: new fields.SchemaField({
          type: new fields.StringField({ initial: "action" }),
          cost: new fields.NumberField({ required: true, initial: 1, integer: true })
        }),
        range: new fields.SchemaField({
          value: new fields.NumberField({ initial: 30, integer: true }),
          units: new fields.StringField({ initial: "ft" })
        }),
        target: new fields.SchemaField({
          value: new fields.NumberField({ initial: 1, integer: true }),
          type: new fields.StringField({ initial: "creature" })
        }),
        powerCost: new fields.NumberField({ required: true, initial: 1, min: 0, integer: true }), // Power point cost
        damage: new fields.ArrayField(
          new fields.ArrayField(new fields.StringField())
        ),
        source: new fields.StringField({ initial: "Psionicist Powers" })
      };
    }
  };

  // Optionally, register a custom sheet for powers (basic for now)
  Items.registerSheet("dnd5e", class PowerSheet extends ItemSheet {
    get template() {
      return `/modules/darksun-psionics/templates/power-sheet.hbs`;
    }
  }, { types: ["power"], label: "Power Sheet" });
});

Hooks.once("ready", async () => {
  if (!game.user.isGM) {
    console.log("[Dark Sun] Skipping compendium population - not GM.");
    return;
  }

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
        console.log(`[Dark Sun] Unlocked compendium ${key} for population.`);
      }
      const response = await fetch(`./modules/darksun-psionics/${path}`);
      if (!response.ok) {
        console.error(`[Dark Sun] Failed to fetch ${path}:`, response.statusText);
        continue;
      }
      const data = await response.json();
      console.log(`[Dark Sun] JSON data to import for ${key}:`, data.map(d => ({ _id: d._id, name: d.name })));
      await Item.createDocuments(data, { pack: key, keepId: true });
      await pack.getIndex({ force: true });
      console.log(`[Dark Sun] ${key} populated with data! Index size:`, pack.index.size);
      await pack.configure({ locked: true });
      console.log(`[Dark Sun] Re-locked compendium ${key} after population.`);
    } else {
      console.log(`[Dark Sun] ${key} already populated. Index size:`, pack.index.size);
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

    // Skill Selection Prompt
    // const skillChoices = ["arcana", "history", "insight", "investigation", "perception", "persuasion"];
    // const currentSkills = actor.system.skills.value || [];
    // if (currentSkills.length < 2 && !options.skipSkillPrompt) {
    //   const selectedSkills = await new Promise(resolve => {
    //     new Dialog({
    //       title: "Choose Psionicist Skills",
    //       content: `
    //         <p>Select 2 skills for your Psionicist:</p>
    //         <select multiple id="skillChoices" size="6">
    //           ${skillChoices.map(skill => `
    //             <option value="${skill}" ${currentSkills.includes(skill) ? "selected" : ""}>
    //               ${skill.charAt(0).toUpperCase() + skill.slice(1)}
    //             </option>
    //           `).join("")}
    //         </select>
    //       `,
    //       buttons: {
    //         ok: {
    //           label: "Confirm",
    //           callback: html => {
    //             const selected = Array.from(html.find("#skillChoices")[0].selectedOptions).map(option => option.value);
    //             if (selected.length !== 2) {
    //               ui.notifications.warn("Please select exactly 2 skills.");
    //               resolve(null);
    //             } else {
    //               resolve(selected);
    //             }
    //           }
    //         }
    //       },
    //       default: "ok"
    //     }).render(true);
    //   });
    //   if (selectedSkills) {
    //     await actor.update({ "system.skills.value": selectedSkills });
    //     console.log(`Set skills for ${actor.name}:`, selectedSkills);
    //   }
    // }

    // const subclassPack = game.packs.get("darksun-psionics.subclasses");
    // const featurePack = game.packs.get("darksun-psionics.features");
    // await subclassPack.getIndex({ force: true });
    // const subclasses = await subclassPack.getDocuments();
    // const subclassOptions = subclasses.filter(s => s.type === "subclass" && s.system.classIdentifier === "psionicist");
    // if (!actor.items.find(i => i.type === "subclass" && i.system.classIdentifier === "psionicist")) {
    //   const choice = await new Promise(resolve => {
    //     new Dialog({
    //       title: "Choose Psionic Discipline",
    //       content: `
    //         <p>Select your Psionic Discipline:</p>
    //         <select id="subclass">
    //           ${subclassOptions.map(s => `<option value="${s._id}">${s.name}</option>`).join("")}
    //         </select>
    //       `,
    //       buttons: {
    //         ok: {
    //           label: "Confirm",
    //           callback: html => resolve(html.find("#subclass").val())
    //         }
    //       }
    //     }).render(true);
    //   });
    //   const subclass = subclassOptions.find(s => s._id === choice);
    //   if (subclass) {
    //     await actor.createEmbeddedDocuments("Item", [subclass.toObject()]);
    //     console.log(`Added ${subclass.name} subclass to ${actor.name}`);
    //     const subclassItem = actor.items.getName(subclass.name);
    //     const advancements = subclassItem.system.advancement.filter(a => a.type === "ItemGrant" && a.level <= level);
    //     console.log("Advancements to apply:", advancements);
    //     const itemsToGrant = advancements.flatMap(a => a.configuration.items.map(item => item.uuid));
    //     console.log("Items to grant (UUIDs):", itemsToGrant);
    //     if (itemsToGrant.length > 0) {
    //       await featurePack.getIndex({ force: true });
    //       const items = [];
    //       for (const id of itemsToGrant) {
    //         const item = await featurePack.getDocument(id);
    //         if (item) {
    //           const itemData = item.toObject();
    //           itemData.flags = itemData.flags || {};
    //           itemData.flags.core = itemData.flags.core || {};
    //           itemData.flags.core.sourceId = `Compendium.darksun-psionics.features.${id}`;
    //           items.push(itemData);
    //         }
    //       }
    //       console.log("Fetched items:", items.map(i => i.name));
    //       if (items.length > 0) {
    //         await actor.createEmbeddedDocuments("Item", items);
    //         console.log(`Granted ${items.length} initial items for ${subclass.name}`);
    //       } else {
    //         console.log("No items fetched for granted UUIDs:", itemsToGrant);
    //       }
    //     } else {
    //       console.log("No initial items found to grant.");
    //     }
    //   }
    // }

    // Power Selection Prompt
    // const powerPack = game.packs.get("darksun-psionics.powers");
    // await powerPack.getIndex({ force: true });
    // const powers = await powerPack.getDocuments();
    // const powerOptions = powers.filter(p => p.system.level === 1);
    // const currentPowers = actor.items.filter(i => i.type === "spell").map(i => i._id);
    // if (currentPowers.length < 2 && !options.skipPowerPrompt) {
    //   const selectedPowers = await new Promise(resolve => {
    //     new Dialog({
    //       title: "Choose Psionic Powers",
    //       content: `
    //         <p>Select 2 level 1 psionic powers:</p>
    //         <select multiple id="powerChoices" size="${powerOptions.length}">
    //           ${powerOptions.map(power => `
    //             <option value="${power._id}" ${currentPowers.includes(power._id) ? "selected" : ""}>
    //               ${power.name}
    //             </option>
    //           `).join("")}
    //         </select>
    //       `,
    //       buttons: {
    //         ok: {
    //           label: "Confirm",
    //           callback: html => {
    //             const selected = Array.from(html.find("#powerChoices")[0].selectedOptions).map(option => option.value);
    //             if (selected.length !== 2) {
    //               ui.notifications.warn("Please select exactly 2 powers.");
    //               resolve(null);
    //             } else {
    //               resolve(selected);
    //             }
    //           }
    //         }
    //       },
    //       default: "ok"
    //     }).render(true);
    //   });
    //   if (selectedPowers) {
    //     const items = [];
    //     for (const id of selectedPowers) {
    //       const power = powerOptions.find(p => p._id === id);
    //       if (power) {
    //         const powerData = power.toObject();
    //         powerData.flags = powerData.flags || {};
    //         powerData.flags.core = powerData.flags.core || {};
    //         powerData.flags.core.sourceId = `Compendium.darksun-psionics.powers.${id}`;
    //         items.push(powerData);
    //       }
    //     }
    //     if (items.length > 0) {
    //       await actor.createEmbeddedDocuments("Item", items);
    //       console.log(`Granted ${items.length} powers to ${actor.name}:`, items.map(i => i.name));
    //     }
    //   }
    // }
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
    console.log(`[Dark Sun] Updated Power Points max to ${powerPoints} for ${actor.name} at level ${newLevel}`);

    const featurePack = game.packs.get("darksun-psionics.features");
    const subclass = actor.items.find(i => i.type === "subclass" && i.system.classIdentifier === "psionicist");
    if (subclass) {
      const advancements = subclass.system.advancement.filter(a => a.type === "ItemGrant" && a.level <= newLevel);
      console.log("[Dark Sun] Advancements to apply:", advancements);
      const itemsToGrant = advancements.flatMap(a => a.configuration.items.map(item => item.uuid));
      console.log("[Dark Sun] Items to grant (UUIDs):", itemsToGrant);
      const existingItems = actor.items
        .filter(i => i.type === "feat")
        .map(i => i.flags.core?.sourceId?.split(".").pop());
      console.log("[Dark Sun] Existing item IDs (sourceId):", existingItems);
      const itemsToAdd = itemsToGrant.filter(id => !existingItems.includes(id));
      console.log("[Dark Sun] Items to add (filtered):", itemsToAdd);
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
        console.log("[Dark Sun] Fetched items:", items.map(i => i.name));
        if (items.length > 0) {
          await actor.createEmbeddedDocuments("Item", items);
          console.log(`[Dark Sun] Granted ${items.length} new items for ${subclass.name} up to level ${newLevel}`);
        } else {
          console.log("[Dark Sun] No items fetched for granted UUIDs:", itemsToAdd);
        }
      } else {
        console.log(`[Dark Sun] No new items to grant for ${subclass.name} at level ${newLevel}`);
      }
    }
    if (actor.sheet) actor.sheet.render(true);
  }
});

Hooks.on("renderActorSheet", (sheet, html) => {
  if (sheet.constructor.name !== "ActorSheet5eCharacter2") return;
  
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
        <!-- <div class="tmp">
          <input type="text" name="system.psionics.pp.temp" data-dtype="Number" 
                placeholder="TMP" value="${pp.temp || ''}">
        </div> -->
      </div>
    </div>
  `;

  // Inject the power points meter after the hit dice section
  const hpMeter = html.find(".meter-group:has(.hit-dice)");
  if (hpMeter.length) {
    hpMeter.after(ppHtml);
  }

  // let resources = html.find(".resources");
  // if (!resources.length) {
  //   resources = $('<div class="resources flexrow"></div>');
  //   const attributes = html.find(".attributes");
  //   if (attributes.length) {
  //     attributes.append(resources);
  //   } else {
  //     html.find(".center-pane").append(resources);
  //   }
  // }
  // resources.html(`
  //   <div class="resource flex-group-center">
  //     <label>Power Points</label>
  //     <input type="text" value="${powerPoints.value}/${powerPoints.max}" readonly>
  //   </div>
  // `);

  const subclass = actor.items.find(i => i.type === "subclass" && i.system.classIdentifier === "psionicist");
  if (subclass) {
    html.find(".class .item-name h4").append(` (${subclass.name})`);
  }
});

Hooks.on("preItemUse", (item, config, options) => {
  const actor = item.actor;
  if (!actor || actor.data.type !== "character") return true; // Ensure it’s a character

  // Check if the item has a powerCost (for powers or feats)
  const powerCost = item.data.data.powerCost || 0;
  if (powerCost > 0 && actor.data.data.classes?.psionicist) {
    const currentPoints = actor.data.data.resources.primary.value;
    if (currentPoints >= powerCost) {
      // Deduct power points
      actor.update({ "data.resources.primary.value": currentPoints - powerCost });
      ui.notifications.info(`${actor.name} spends ${powerCost} Power Points to use ${item.name}.`);
      return true; // Proceed with item use
    } else {
      ui.notifications.warn(`${actor.name} does not have enough Power Points for ${item.name} (Cost: ${powerCost}).`);
      return false; // Cancel item use
    }
  }
  return true; // Allow non-psionic items to proceed
});

Hooks.on("renderChatMessage", (message, html, data) => {
  // Optional: Enhance chat messages for powers
  if (message.item?.type === "power") {
    html.find(".card-content").append(`<p><strong>Power Cost:</strong> ${message.item.data.data.powerCost} PP</p>`);
  }
});