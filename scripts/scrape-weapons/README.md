- cd into this folder
- `bun run scrape.ts` IMPORTANT: sote column is not generated, u wll have to add by hand!!!!
- review weapons.csv output (there might be some errors)
- `python convert_csv_to_json.py`

- Scrape weapon data similar to `scripts/scrape-weapon-requirements/scrapeRequirements.ts` but with the following diferences:
  - Scrape not only weapon stat requirements, but also:
    - Weapons name
    - Attack power
    - Scaling
    - Guard values
    - Weapon type, e.g. Greatsword, Halberd, etc.
    - Damage types, e.g. Standard / Pierce
    - Weight
    - Whether it is upgraded with somber or regular stones
      - Somber: "can be upgraded by using Somber"
      - Regular: "can be upgraded by using Smithing"
- Append data to the file weapon by weapon so I can see the progress
- The output be added to `weapons.csv`
- When running the script, delete the old content from the file if any

Issues:
- Missing Data: Many rows have "-" placeholders, especially for scaling, requirements, damageTypes, weaponSkill, fpCost, and passive effects. The data is not correctly scraped, some of these values should not be empty
- Inconsistent Formatting:
  - Weight: Mixture of decimal and integer values.
  - Damage Types: Variations in format (e.g., "Slash / Pierce", "Slash/Pierce").
  - Passive Effects: Inconsistent format for status buildup (e.g., "(60)", ": (38)") and descriptive text mixed with values.
- Misplaced/Incorrect Data:
  - `fpCost` Column: Some rows incorrectly list "Wgt." or "Weight" instead of FP cost.
  - `Grave Scythe`: Has "-" under `fireAtk`.
  - `Meteorite Staff`: Has `0` for `critAtk` (unusual).
- Malformed Rows:
  - `Godskin Peeler`: Row appears truncated.
  - `Nightrider Flail`: Row appears truncated.
- "Unknown" Upgrade Type: Many weapons list "Unknown" for upgrade material type.
- Non-Weapon Items: Some rows (`Wraith Calling Bell`, `Omen Bairn`, `Regal Omen Bairn`) are not weapons and lack data.
- Inconsistent `passive` column: Values vary significantly (numbers in parens, text descriptions, "-").
- Inconsistent `damageTypes` column: Formatting varies (e.g. "Slash / Pierce", "Slash/Pierce").

Notes:
- Weight: preserve source format
- Damage types: trim whitespace if multiple types
- Status build up values: you can trim the parentheses, I want each status build up value in a separate column
- if there is a passive effect that does not match any status (hemorrhage, frostbite, etc) store it as is in a separate column "passiveOther"
- missing placeholder: - is ok
- no need to do anything particular about non-weapon items, I will filter them out later
- Staves and Seals have an additional attack power value, called "Sor" and "Inc" respectively, add it to the data

html examples:

```html
<!-- regular upgrade -->
 <li><strong>Firespark Perfume Bottle</strong> can be upgraded by using&nbsp;<a class="wiki_link" href="https://eldenring.wiki.fextralife.com/">Smithing Stones</a>.</li>
<!-- somber upgrade -->
<li><strong>Greatsword of Radahn (Light)</strong> can be upgraded by using <a class="wiki_link" title="Elden Ring Somber Smithing Stones" href="/Somber+Smithing+Stones" target="">Somber Smithing Stones</a>.</li>
```

```html
<!-- weapon info example -->
<div id="infobox" class="infobox">
 <div class="table-responsive">
  <table class="wiki_table">
   <tbody>
    <tr>
     <th colspan="2"> <h2>Greatsword of Radahn (Light)</h2> </th>
    </tr>
    <tr>
     <td style="text-align: center;" colspan="2"><img style="width: 200px; height: 200px;" title="Elden Ring Shadow of the Erdtree Greatsword of Radahn (Light)" src="/file/Elden-Ring/greatsword_of_radahn_(light)_elden_ring_shadow_of_the_erdtree_dlc_wiki_guide_200px.png" alt="greatsword of radahn (light) elden ring shadow of the erdtree dlc wiki guide 200px"></td>
    </tr>
    <tr>
     <td><img style="float: left;" title="Attack Power" src="/file/Elden-Ring/attack-power-elden-ring-wiki-guide-18.png" alt="attack power elden ring wiki guide 18" width="18" height="18">Attack
      <div class="lineleft">
       <span style="color: #ffffff;"><a class="wiki_link" style="color: #ffffff;" title="Elden Ring Physical Damage" href="/Physical+Damage">Phy</a>&nbsp;129</span>
       <br>
       <a class="wiki_link" style="color: #3fbddd;" title="Elden Ring Magic Damage" href="/Magic+Damage">Mag</a>&nbsp;83
       <br>
       <span style="color: #ff9900;"><a class="wiki_link" style="color: #cc9d57;" title="Elden Ring Fire Damage" href="/Fire+Damage">Fire</a></span>&nbsp;0
       <br>
       <span style="color: #ffff00;"><a class="wiki_link" style="color: #d5d559;" title="Elden Ring Lightning Damage" href="/Lightning+Damage">Ligt</a></span>&nbsp;0
       <br>
       <span style="color: #ffcc99;"><a class="wiki_link" style="color: #ffcc99;" title="Elden Ring Holy Damage" href="/Holy+Damage">Holy</a></span>&nbsp;0
       <br>
       <span style="color: #ff0000;"><a class="wiki_link" style="color: #c64949;" title="Elden Ring Critical Damage" href="/Critical+Damage">Crit</a></span>&nbsp;100
      </div> </td>
     <td><img style="float: left;" title="Guarded Damage Negation" src="/file/Elden-Ring/guarded-damage-negation-elden-ring-wiki-guide-18.png" alt="guarded damage negation elden ring wiki guide 18" width="18" height="18">Guard
      <div class="lineleft">
        Phy&nbsp;65
       <br>
       <span style="color: #3fbddd;">Mag</span>&nbsp;47
       <br>
       <span style="color: #cc9d57;">Fire</span>&nbsp;34
       <br>
       <span style="color: #d5d559;">Ligt</span>&nbsp;34
       <br>
       <span style="color: #ffcc99;">Holy</span>&nbsp;34
       <br>
       <span style="color: #666699;">Boost</span>&nbsp;52
      </div> </td>
    </tr>
    <tr>
     <td><img title="Attribute Scaling" src="/file/Elden-Ring/attribute-scaling-elden-ring-wiki-guide-18.png" alt="attribute scaling elden ring wiki guide 18" width="18" height="18">Scaling
      <div class="lineleft">
       <a class="wiki_link" title="Elden Ring Strength" href="/Strength">Str</a>&nbsp;D
       <br>
       <a class="wiki_link" title="Elden Ring Dexterity" href="/Dexterity">Dex</a>&nbsp;D
       <br>
       <a class="wiki_link" title="Elden Ring Intelligence" href="/Intelligence" target="">Int</a>&nbsp;E
      </div> </td>
     <td><img style="float: left;" title="Attributes Requirement" src="/file/Elden-Ring/attributes-required-elden-ring-wiki-guide-18.png" alt="attributes required elden ring wiki guide 18" width="18" height="18">Requires
      <div class="lineleft">
       <a class="wiki_link" title="Elden Ring Str" href="/Str">Str</a> 32
       <br>
       <a class="wiki_link" title="Elden Ring Dex" href="/Dex">Dex</a> 24
       <br>
       <a class="wiki_link" title="Elden Ring Int" href="/Int">Int</a> 15
      </div> </td>
    </tr>
    <tr>
     <td><a class="wiki_link" title="Elden Ring Colossal Swords" href="/Colossal+Swords">Colossal Sword</a></td>
     <td><a class="wiki_link" title="Elden Ring Standard Damage" href="/Standard+Damage" target="">Standard</a>/<a class="wiki_link" title="Elden Ring Pierce Damage" href="/Pierce+Damage" target="">Pierce</a></td>
    </tr>
    <tr>
     <td><a class="wiki_link" title="Elden Ring Lightspeed Slash" href="/Lightspeed+Slash" target="">Lightspeed Slash</a></td>
     <td><a class="wiki_link" title="Elden Ring FP" href="/FP">FP</a>&nbsp;26</td>
    </tr>
    <tr>
     <td><a class="wiki_link" title="Elden Ring Weight" href="/Weight">Wgt.</a>&nbsp;19.<span style="color: #ffffff;">0</span></td>
     <td><a class="wiki_link" title="Elden Ring Passive Effects" href="/Passive+Effects"><img style="float: left;" title="Passive Effects" src="/file/Elden-Ring/passive-effects-elden-ring-wiki-guide-18.png" alt="passive effects elden ring wiki guide 18" width="18" height="18">Passive</a>&nbsp;-</td>
    </tr>
   </tbody>
  </table>
 </div>
</div>
```

```html
<!-- staff infobox example (notice additional "Sor" value in the Attack Power section, for a seal it would be "Inc") -->
<div id="infobox" class="infobox">
 <div class="table-responsive">
  <table class="wiki_table">
   <tbody>
    <tr>
     <th colspan="2"> <h2>Albinauric Staff</h2> </th>
    </tr>
    <tr>
     <td style="text-align: center;" colspan="2"><img style="width: 200px; height: 200px;" title="Albinauric Staff" src="/file/Elden-Ring/albinauric_staff_glintstonestaff_weapon_elden_ring_wiki_guide_200px.png" alt="albinauric staff glintstonestaff weapon elden ring wiki guide 200px" width="200" height="200"></td>
    </tr>
    <tr>
     <td><img style="float: left;" title="Attack Power" src="/file/Elden-Ring/attack-power-elden-ring-wiki-guide-18.png" alt="attack power elden ring wiki guide 18" width="18" height="18">Attack
      <div class="lineleft">
       <span style="color: #ffffff;"><a class="wiki_link" style="color: #ffffff;" title="Elden Ring Physical Damage" href="/Physical+Damage">Phy</a>&nbsp;17</span>
       <br>
       <a class="wiki_link" style="color: #3fbddd;" title="Elden Ring Magic Damage" href="/Magic+Damage">Mag</a>&nbsp;0
       <br>
       <span style="color: #ff9900;"><a class="wiki_link" style="color: #cc9d57;" title="Elden Ring Fire Damage" href="/Fire+Damage">Fire</a></span>&nbsp;0
       <br>
       <span style="color: #ffff00;"><a class="wiki_link" style="color: #d5d559;" title="Elden Ring Lightning Damage" href="/Lightning+Damage">Ligt</a></span>&nbsp;0
       <br>
       <span style="color: #ffcc99;"><a class="wiki_link" style="color: #ffcc99;" title="Elden Ring Holy Damage" href="/Holy+Damage">Holy</a></span>&nbsp;0
       <br>
       <span style="color: #ff0000;"><a class="wiki_link" style="color: #c64949;" title="Elden Ring Critical Damage" href="/Critical+Damage">Crit</a></span>&nbsp;100
       <br>
       <span style="color: #00ffff;">Sor</span> 110
      </div> </td>
     <td><img style="float: left;" title="Guarded Damage Negation" src="/file/Elden-Ring/guarded-damage-negation-elden-ring-wiki-guide-18.png" alt="guarded damage negation elden ring wiki guide 18" width="18" height="18">Guard
      <div class="lineleft">
        Phy&nbsp;23
       <br>
       <span style="color: #3fbddd;">Mag</span>&nbsp;14
       <br>
       <span style="color: #cc9d57;">Fire</span>&nbsp;14
       <br>
       <span style="color: #d5d559;">Ligt</span>&nbsp;14
       <br>
       <span style="color: #ffcc99;">Holy</span>&nbsp;14
       <br>
       <span style="color: #666699;">Boost</span>&nbsp;14
       <br>
       <br>
      </div> </td>
    </tr>
    <tr>
     <td><img title="Attribute Scaling" src="/file/Elden-Ring/attribute-scaling-elden-ring-wiki-guide-18.png" alt="attribute scaling elden ring wiki guide 18" width="18" height="18">Scaling
      <div class="lineleft">
        Str E
       <br>
       <a class="wiki_link" title="Elden Ring Intelligence" href="/Intelligence">Int</a> D
       <br>
       <a class="wiki_link" title="Elden Ring Arcane" href="/Arcane">Arc</a> C
      </div> </td>
     <td><img style="float: left;" title="Attributes Requirement" src="/file/Elden-Ring/attributes-required-elden-ring-wiki-guide-18.png" alt="attributes required elden ring wiki guide 18" width="18" height="18">Requires
      <div class="lineleft">
        Str&nbsp;6
       <br>
       <a class="wiki_link" title="Elden Ring Intelligence" href="/Intelligence">Int</a>&nbsp;10
       <br>
       <a class="wiki_link" title="Elden Ring Arcane" href="/Arcane">Arc</a>&nbsp;12
      </div> </td>
    </tr>
    <tr>
     <td><a class="wiki_link" title="Elden Ring Glintstone Staffs" href="/Glintstone+Staffs" target="">Glintstone Staff</a></td>
     <td><a class="wiki_link" title="Elden Ring Strike Damage" href="/Strike+Damage">Strike</a></td>
    </tr>
    <tr>
     <td><a class="wiki_link" title="Elden Ring No Skill" href="/No+Skill">No Skill</a></td>
     <td><a class="wiki_link" title="Elden Ring FP" href="/FP">FP</a>&nbsp;-</td>
    </tr>
    <tr>
     <td><a class="wiki_link" title="Elden Ring Weight" href="/Weight">Wgt.</a>&nbsp;2.5</td>
     <td> <p><a class="wiki_link" title="Elden Ring Passive Effects" href="/Passive+Effects"><img style="float: left;" title="Passive Effects" src="/file/Elden-Ring/passive-effects-elden-ring-wiki-guide-18.png" alt="passive effects elden ring wiki guide 18" width="18" height="18">Passive</a> -</p> </td>
    </tr>
   </tbody>
  </table>
 </div>
</div>
```

```html
<!-- example of weapon with passive hemorrhage effect -->
<div id="infobox" class="infobox">
 <div class="table-responsive">
  <table class="wiki_table">
   <tbody>
    <tr>
     <th colspan="2"> <h2>Reduvia</h2> </th>
    </tr>
    <tr>
     <td style="text-align: center;" colspan="2"><img title="Elden Ring Reduvia" src="/file/Elden-Ring/reduvia_dagger_weapon_elden_ring_wiki_guide_200px.png" alt="reduvia dagger weapon elden ring wiki guide 200px" width="200" height="200"></td>
    </tr>
    <tr>
     <td><img style="float: left;" title="Attack Power" src="/file/Elden-Ring/attack-power-elden-ring-wiki-guide-18.png" alt="attack power elden ring wiki guide 18" width="18" height="18">Attack
      <div class="lineleft">
       <span style="color: #ffffff;"><a class="wiki_link" style="color: #ffffff;" title="Elden Ring Physical Damage" href="/Physical+Damage">Phy</a>&nbsp;79</span>
       <br>
       <a class="wiki_link" style="color: #3fbddd;" title="Elden Ring Magic Damage" href="/Magic+Damage">Mag</a> 0
       <br>
       <span style="color: #ff9900;"><a class="wiki_link" style="color: #cc9d57;" title="Elden Ring Fire Damage" href="/Fire+Damage">Fire</a></span> 0
       <br>
       <span style="color: #ffff00;"><a class="wiki_link" style="color: #d5d559;" title="Elden Ring Lightning Damage" href="/Lightning+Damage">Ligt</a></span>&nbsp;0
       <br>
       <span style="color: #ffcc99;"><a class="wiki_link" style="color: #ffcc99;" title="Elden Ring Holy Damage" href="/Holy+Damage">Holy</a></span> 0
       <br>
       <span style="color: #ff0000;"><a class="wiki_link" style="color: #c64949;" title="Elden Ring Critical Damage" href="/Critical+Damage">Crit</a></span> 110
      </div> </td>
     <td><img style="float: left;" title="Guarded Damage Negation" src="/file/Elden-Ring/guarded-damage-negation-elden-ring-wiki-guide-18.png" alt="guarded damage negation elden ring wiki guide 18" width="18" height="18">Guard
      <div class="lineleft">
        Phy 38
       <br>
       <span style="color: #3fbddd;">Mag</span>&nbsp;22
       <br>
       <span style="color: #cc9d57;">Fire</span> 22
       <br>
       <span style="color: #d5d559;">Ligt</span> 22
       <br>
       <span style="color: #ffcc99;">Holy</span> 22
       <br>
       <span style="color: #666699;">Boost</span>&nbsp;16
      </div> </td>
    </tr>
    <tr>
     <td><img title="Attribute Scaling" src="/file/Elden-Ring/attribute-scaling-elden-ring-wiki-guide-18.png" alt="attribute scaling elden ring wiki guide 18" width="18" height="18">Scaling
      <div class="lineleft">
       <a class="wiki_link" title="Elden Ring Strength" href="/Strength" target="">Str</a>&nbsp;E
       <br>
       <a class="wiki_link" title="Elden Ring Dexterity" href="/Dexterity">Dex</a>&nbsp;D
       <br>
       <a class="wiki_link" title="Elden Ring Arcane" href="/Arcane">Arc</a> D
      </div> </td>
     <td><img style="float: left;" title="Attributes Requirement" src="/file/Elden-Ring/attributes-required-elden-ring-wiki-guide-18.png" alt="attributes required elden ring wiki guide 18" width="18" height="18">Requires
      <div class="lineleft">
       <a class="wiki_link" title="Elden Ring Strength" href="/Strength" target="">Str</a>&nbsp;5
       <br>
       <a class="wiki_link" title="Elden Ring Dexterity" href="/Dexterity" target="">Dex</a>&nbsp;13
       <br>
       <a class="wiki_link" title="Elden Ring Arcane" href="/Arcane">Arc</a>&nbsp;13
      </div> </td>
    </tr>
    <tr>
     <td><a class="wiki_link" title="Elden Ring Daggers" href="/Daggers" target="">Daggers</a></td>
     <td><a class="wiki_link" title="Elden Ring Damage Types" href="/Damage+Types">Slash&nbsp;/ Pierce</a></td>
    </tr>
    <tr>
     <td><a class="wiki_link" title="Elden Ring Reduvia Blood Blade" href="/Reduvia+Blood+Blade">Reduvia Blood Blade</a></td>
     <td><a class="wiki_link" title="Elden Ring FP" href="/FP">FP</a>&nbsp;6&nbsp;( - 6)</td>
    </tr>
    <tr>
     <td><a class="wiki_link" title="Elden Ring Weight" href="/Weight">Wgt.</a>&nbsp;2<span style="color: #ffffff;">.5</span></td>
     <td> <p><a class="wiki_link" title="Elden Ring Passive Effects" href="/Passive+Effects"><img style="float: left;" title="Passive Effects" src="/file/Elden-Ring/passive-effects-elden-ring-wiki-guide-18.png" alt="passive effects elden ring wiki guide 18" width="18" height="18">Passive</a><br><a class="wiki_link" title="Elden Ring Hemorrhage" href="/Hemorrhage"><img title="" src="/file/Elden-Ring/hemmorage.png" alt="hemmorage" width="18"></a><a class="wiki_link" title="Elden Ring Hemorrhage" href="/Hemorrhage">(50)</a></p> </td>
    </tr>
   </tbody>
  </table>
 </div>
</div>
```