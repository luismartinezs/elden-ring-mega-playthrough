Scraping spell data works different than weapons

- the url with the links to all spells is https://eldenring.wiki.fextralife.com/Magic+Spells
- spells have different values to scrape:
  - Spell name, e.g. Great Glintstone Shard
  - spell category, e.g. sorcery, can be determined from the breadcrums
  - spell type, e.g. Glintstone sorceries
  - FP cost, eg 12
  - Slots used, eg 1
  - Stat requirements, e.g intelligence 10, faith 9, arcane 13
- data should be appended, spell by spell, to a spells.csv file in the same directory as the scrape script

html examples:

```html
<!-- breadcrumbs -->
<div id="breadcrumbs-container">
<a href="https://eldenring.wiki.fextralife.com/Equipment+&amp;+Magic">Equipment &amp; Magic</a>&nbsp;/&nbsp;<a href="https://eldenring.wiki.fextralife.com/Magic+Spells">Magic</a>&nbsp;/&nbsp;<a href="https://eldenring.wiki.fextralife.com/Sorceries">Sorceries</a>
  <div id="breadcrumbs-bcontainer" style="display:none;">&nbsp;&nbsp;<a id="btnCreateBreadcrumb" title="Add Breadcrumb" href="#">+</a></div>
</div>
```

```html
<!-- infobox -->
 <div id="infobox" class="infobox">
 <div class="table-responsive">
  <table class="wiki_table">
   <tbody>
    <tr>
     <th style="text-align: center;" colspan="2"> <h2>Great Glintstone Shard</h2> </th>
    </tr>
    <tr>
     <td style="text-align: center;" colspan="2"><img title="great-glintstone-shard_spells-elden-ring-wiki-guide-200" src="/file/Elden-Ring/great_glintstone_shard_sorcery_elden_ring_wiki_guide_200px.png" alt="great glintstone shard sorcery elden ring wiki guide 200px" width="200" height="200"></td>
    </tr>
    <tr>
     <td>Spell Type</td>
     <td><a class="wiki_link" title="Elden Ring Glintstone Sorceries" href="/Glintstone+Sorceries" target="">Glintstone Sorceries</a></td>
    </tr>
    <tr>
     <td>FP Cost 12</td>
     <td>Slots Used 1</td>
    </tr>
    <tr>
     <td colspan="2"><img title="item_effect_icon_elden_ring_wiki_guide_18px" src="/file/Elden-Ring/item_effects_icon_elden_ring_wiki_guide_55px_18px.png" alt="item effects icon elden ring wiki guide 55px 18px" width="18" height="18">Effect
      <div class="lineleft">
        Fires larger magic projectiles from glintstone
      </div> <br><img style="float: left;" title="Attributes Requirement" src="/file/Elden-Ring/attributes-required-elden-ring-wiki-guide-18.png" alt="attributes required elden ring wiki guide 18" width="18" height="18">Requires
      <div class="lineleft">
       <a class="wiki_link" title="Elden Ring Intelligence" href="/Intelligence" target="">Intelligence</a> 16
       <br>
       <a class="wiki_link" title="Elden Ring Faith" href="/Faith" target="">Faith</a>&nbsp;0
       <br>
       <a class="wiki_link" title="Elden Ring Arcane" href="/Arcane" target="">Arcane</a>&nbsp;0
      </div> </td>
    </tr>
   </tbody>
  </table>
 </div>
</div>
```