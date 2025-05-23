import axios from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = 'https://eldenring.wiki.fextralife.com';
const WEAPONS_LIST_URL = `${BASE_URL}/Weapons`;
const CSV_FILE_PATH = path.join(__dirname, 'weapons.csv');
// Control parameter: Set to a positive number to limit scraping, or -1 to scrape all.
const MAX_WEAPONS_TO_SCRAPE = -1;
// Control parameters: Set to positive numbers (1-based index) to scrape a specific slice. -1 disables.
const HEAD_INDEX = -1; // Start index (inclusive, 1-based)
const TAIL_INDEX = -1; // End index (inclusive, 1-based)

interface WeaponData {
    name: string;
    category: string;
    phyAtk: string;
    magAtk: string;
    fireAtk: string;
    ligtAtk: string;
    holyAtk: string;
    critAtk: string;
    sorAtk: string;
    incAtk: string;
    phyGuard: string;
    magGuard: string;
    fireGuard: string;
    ligtGuard: string;
    holyGuard: string;
    boostGuard: string;
    strScale: string;
    dexScale: string;
    intScale: string;
    faiScale: string;
    arcScale: string;
    strReq: string;
    dexReq: string;
    intReq: string;
    faiReq: string;
    arcReq: string;
    damageTypes: string;
    weaponSkill: string;
    fpCost: string;
    weight: string;
    passive: string;
    poison: string;
    hemorrhage: string;
    frostbite: string;
    scarletRot: string;
    sleep: string;
    madness: string;
    deathBlight: string;
    upgradeType: 'Somber' | 'Regular' | 'Unknown';
    url: string;
}

// Helper function to safely extract text, returning '-' if not found or empty
const safeExtractText = ($: cheerio.CheerioAPI, selector: string, context?: cheerio.Cheerio): string => {
    const element = context ? $(selector, context) : $(selector);
    const text = element.text().trim();
    return text || '-';
};

// Helper function to extract numerical value from text, defaulting to 0 if label is present but no value or just '-'
const extractValueOrZero = (text: string): string => {
    const match = text ? text.match(/-?\d+(\.\d+)?/) : null;
    if (match) {
        return match[0];
    } else if (text && text.trim() === '-') {
        // Handle cases like "FP -" or "Passive -"
        return '0';
    }
    return '0'; // Default to 0 if no number found or text is empty/null
};

// Helper function to find the text node immediately following a specific element or its parent span
const findNextTextNodeValue = ($: cheerio.CheerioAPI, element: cheerio.Cheerio): string => {
    if (!element.length) return ''; // Ensure element exists
    const firstNode = element[0];
    if (!firstNode) return ''; // Explicitly check node existence

    // 1. Check immediate next sibling
    // @ts-ignore - Workaround for persistent Cheerio type issue
    let nextNode = firstNode.nextSibling;
    if (nextNode?.type === 'text') {
        // @ts-ignore - Workaround for persistent Cheerio type issue
        const text = (nextNode as cheerio.TextElement).data.trim();
        if (text) return text; // Return if found and not empty
    }

    // 2. Check parent's next sibling (handles cases where element is wrapped, e.g., in a span)
    // @ts-ignore - Workaround for persistent Cheerio type issue
    const parentNode = firstNode.parentNode;
    if (parentNode && parentNode.type !== 'root') { // Check if parent exists and is not the root
        // @ts-ignore - Workaround for persistent Cheerio type issue
        nextNode = parentNode.nextSibling;
        if (nextNode?.type === 'text') {
             // @ts-ignore - Workaround for persistent Cheerio type issue
            const text = (nextNode as cheerio.TextElement).data.trim();
            if (text) return text; // Return if found and not empty
        }
    }

    // 3. Fallback: Check next span sibling (less common case seen before)
    const nextSpan = element.next('span');
    if (nextSpan.length) {
        const spanText = nextSpan.text().trim();
        if (spanText) return spanText;
    }

    return ''; // Return empty if not found
};

// Helper function to extract scaling value (letter or -)
const extractScaling = (text: string, type: 'Str' | 'Dex' | 'Int' | 'Fai' | 'Arc'): string => {
    const regex = new RegExp(`${type}\\s+([A-Z\\-])`);
    const match = text.match(regex);
    return match ? (match[1] ?? '-') : '-';
};

// Helper function to extract requirement value (number or -)
const extractRequirement = (text: string, type: 'Str' | 'Dex' | 'Int' | 'Fai' | 'Arc'): string => {
    const reqRegex = new RegExp(`${type}\\s+(\\d+)`);
    const match = text.match(reqRegex);
    return match ? (match[1] ?? '-') : '-';
};

// Updated helper function - Now accepts Cheerio Root instance '$'
const extractPassive = ($: cheerio.Root, element: cheerio.Cheerio): string => {
    // console.log("[extractPassive] Starting...");
    const paragraphs = element.find('p');
    // console.log(`[extractPassive] Found ${paragraphs.length} paragraphs.`);

    if (paragraphs.length === 0) {
        // console.log("[extractPassive] No paragraphs found, returning '-'.");
        return '-'; // No paragraphs found
    }

    // Keywords/patterns to identify the status effect paragraph
    const statusEffectKeywords = [
        '/Poison', '/Hemorrhage', '/Frostbite', '/Scarlet+Rot',
        '/Sleep', '/Madness', '/Death+Blight'
    ];

    let statusParagraphIndex = -1;

    paragraphs.each((index, p) => {
        // Revert to standard Cheerio wrapping for the element in the loop
        const paragraph = $(p); // Use $(p) which should correctly wrap the element
        const html = paragraph.html(); // Check HTML content
        // console.log(`[extractPassive] Checking Paragraph ${index} HTML: ${html?.substring(0, 100)}...`); // Log start of HTML
        if (!html) {
            // console.log(`[extractPassive] Paragraph ${index} has no HTML, skipping.`);
            return; // Skip if no HTML
        }

        // Check ONLY for links containing status effect keywords in href
        const hasStatusLink = statusEffectKeywords.some(keyword => html.includes(`href="${keyword}"`));

        // Rely solely on the presence of a status effect link
        if (hasStatusLink) {
            // console.log(`[extractPassive] Status link found in Paragraph ${index}.`);
            statusParagraphIndex = index;
            return false; // Stop .each loop once found
        }
    });

    // console.log(`[extractPassive] Determined Status Paragraph Index: ${statusParagraphIndex}`);

    let passiveParagraphIndex = -1;

    if (paragraphs.length === 1) {
        // If the single paragraph is not the status one, assume it's passive
        if (statusParagraphIndex !== 0) {
            passiveParagraphIndex = 0;
        }
    } else if (paragraphs.length >= 2) {
        // If status found in first, passive is second (or first potential)
        if (statusParagraphIndex === 0) {
            passiveParagraphIndex = 1;
        }
        // If status found in second, passive is first
        else if (statusParagraphIndex === 1) {
            passiveParagraphIndex = 0;
        }
        // If status not found in first two, assume passive is first (heuristic)
        else {
             passiveParagraphIndex = 0;
        }
    }

    console.log(`[extractPassive] Determined Passive Paragraph Index: ${passiveParagraphIndex}`);

    if (passiveParagraphIndex === -1) {
        console.log("[extractPassive] Could not determine passive paragraph, returning '-'.");
        return '-'; // Could not determine passive paragraph
    }

    const passiveParagraph = paragraphs.eq(passiveParagraphIndex);
    console.log(`[extractPassive] Raw Passive Paragraph HTML: ${passiveParagraph.html()}`);

    // Clone the paragraph to modify it without affecting the original structure if needed elsewhere
    const tempParagraph = passiveParagraph.clone();

    // Find and remove the "Passive" link/image part if it exists
    tempParagraph.find('a:has(img[title="Passive Effects"]), a:contains("Passive")').remove();
    console.log(`[extractPassive] Passive Paragraph HTML after cleaning link: ${tempParagraph.html()}`);

    // Get the remaining text and trim it
    const passiveText = tempParagraph.text().trim();
    console.log(`[extractPassive] Extracted Passive Text: "${passiveText}"`);

    console.log("[extractPassive] Finished.");
    return passiveText || '-'; // Return text or '-' if empty after removal
};

// Function to scrape data for a single weapon
async function scrapeWeaponData(weaponUrl: string, index: number): Promise<WeaponData | null> {
    try {
        const fullUrl = weaponUrl.startsWith('http') ? weaponUrl : `${BASE_URL}${weaponUrl}`;
        console.log(`Scraping: ${index} - ${fullUrl}`);
        const { data } = await axios.get(fullUrl);
        const $ = cheerio.load(data);

        const infobox = $('#infobox');
        if (!infobox.length) {
            console.warn(`Could not find infobox for ${fullUrl}`);
            return null;
        }

        // Initialize weaponData with defaults, especially for numeric types and new passives
        const weaponData: Partial<WeaponData> = {
            url: fullUrl,
            name: infobox.find('h2').first().text().trim() || '-',
            phyAtk: '-', magAtk: '-', fireAtk: '-', ligtAtk: '-', holyAtk: '-', critAtk: '-', sorAtk: '-', incAtk: '-',
            phyGuard: '-', magGuard: '-', fireGuard: '-', ligtGuard: '-', holyGuard: '-', boostGuard: '-',
            strScale: '-', dexScale: '-', intScale: '-', faiScale: '-', arcScale: '-',
            strReq: '-', dexReq: '-', intReq: '-', faiReq: '-', arcReq: '-',
            category: '-', damageTypes: '-', weaponSkill: '-', fpCost: '-', weight: '-', passive: '-',
            // Initialize new passive fields
            poison: '-', hemorrhage: '-', frostbite: '-', scarletRot: '-', sleep: '-', madness: '-', deathBlight: '-',
            upgradeType: 'Unknown'
        };

        if (!weaponData.name || weaponData.name === '-') {
            console.warn(`Could not find valid name for ${fullUrl}, skipping.`);
            return null; // Skip if name is missing or invalid
        }

        // --- Attack Power --- Find the correct td based on the img title
        const attackPowerTd = infobox.find('img[title="Attack Power"]').closest('td');
        if (attackPowerTd.length) {
            const attackDiv = attackPowerTd.find('div.lineleft');
            // @ts-ignore - Workaround for persistent Cheerio type issue
            weaponData.phyAtk = extractValueOrZero(findNextTextNodeValue($, attackDiv.find('a[title*="Physical Damage"]')));
            // @ts-ignore - Workaround for persistent Cheerio type issue
            weaponData.magAtk = extractValueOrZero(findNextTextNodeValue($, attackDiv.find('a[title*="Magic Damage"]')));
            // @ts-ignore - Workaround for persistent Cheerio type issue
            weaponData.fireAtk = extractValueOrZero(findNextTextNodeValue($, attackDiv.find('a[title*="Fire Damage"]'))); // Link might be inside span
            // @ts-ignore - Workaround for persistent Cheerio type issue
            if (weaponData.fireAtk === '0') weaponData.fireAtk = extractValueOrZero(findNextTextNodeValue($, attackDiv.find('span:contains("Fire")'))); // Try span if link fails
            // @ts-ignore - Workaround for persistent Cheerio type issue
            weaponData.ligtAtk = extractValueOrZero(findNextTextNodeValue($, attackDiv.find('a[title*="Lightning Damage"]')));
            // @ts-ignore - Workaround for persistent Cheerio type issue
            if (weaponData.ligtAtk === '0') weaponData.ligtAtk = extractValueOrZero(findNextTextNodeValue($, attackDiv.find('span:contains("Ligt")')));
            // @ts-ignore - Workaround for persistent Cheerio type issue
            weaponData.holyAtk = extractValueOrZero(findNextTextNodeValue($, attackDiv.find('a[title*="Holy Damage"]')));
            // @ts-ignore - Workaround for persistent Cheerio type issue
            if (weaponData.holyAtk === '0') weaponData.holyAtk = extractValueOrZero(findNextTextNodeValue($, attackDiv.find('span:contains("Holy")')));
            // @ts-ignore - Workaround for persistent Cheerio type issue
            const critLink = attackDiv.find('a[title*="Critical Damage"]');
            // @ts-ignore - Workaround for persistent Cheerio type issue
            const critValueText = findNextTextNodeValue($, critLink);
            weaponData.critAtk = extractValueOrZero(critValueText);

            // --- DEBUG sorAtk Start ---
            let sorAtkText = '';
            const sorceryScalingLink = attackDiv.find('a[title*="Sorcery Scaling"]');
            // console.log(`  [Debug sorAtk] Found Sorcery Scaling link: ${sorceryScalingLink.length > 0}`);
            if (sorceryScalingLink.length > 0) {
                // @ts-ignore - Workaround for persistent Cheerio type issue
                sorAtkText = findNextTextNodeValue($, sorceryScalingLink);
            } else {
                // Fallback: Try finding the span containing "Sor"
                const sorceryScalingSpan = attackDiv.find('span:contains("Sor")');
                // console.log(`  [Debug sorAtk] Link not found. Found Sorcery Scaling span: ${sorceryScalingSpan.length > 0}`);
                if (sorceryScalingSpan.length > 0) {
                    // @ts-ignore - Workaround for persistent Cheerio type issue
                    sorAtkText = findNextTextNodeValue($, sorceryScalingSpan);
                }
            }
            // console.log(`  [Debug sorAtk] Text found for Sorcery Scaling: "${sorAtkText}"`);
            weaponData.sorAtk = extractValueOrZero(sorAtkText);
            // console.log(`  [Debug sorAtk] Final sorAtk value after extractValueOrZero: "${weaponData.sorAtk}"`);
             // --- DEBUG sorAtk End ---

             // @ts-ignore - Workaround for persistent Cheerio type issue
             weaponData.incAtk = extractValueOrZero(findNextTextNodeValue($, attackDiv.find('a[title*="Incant Scaling"]')));

        }

        // --- Guarded Damage Negation --- Find the correct td and div
        const guardTd = infobox.find('img[title="Guarded Damage Negation"]').closest('td');
        if (guardTd.length) {
            const guardDiv = guardTd.find('div.lineleft');
            // Phy guard often doesn't have a span/link, look for text node directly
            weaponData.phyGuard = extractValueOrZero(guardDiv.contents().filter((_, node) => node.type === 'text' && $(node).text().trim().startsWith('Phy')).text().trim());
            // @ts-ignore - Workaround for persistent Cheerio type issue
            weaponData.magGuard = extractValueOrZero(findNextTextNodeValue($, guardDiv.find('span:contains("Mag")')));
            // @ts-ignore - Workaround for persistent Cheerio type issue
            weaponData.fireGuard = extractValueOrZero(findNextTextNodeValue($, guardDiv.find('span:contains("Fire")')));
            // @ts-ignore - Workaround for persistent Cheerio type issue
            weaponData.ligtGuard = extractValueOrZero(findNextTextNodeValue($, guardDiv.find('span:contains("Ligt")')));
            // @ts-ignore - Workaround for persistent Cheerio type issue
            weaponData.holyGuard = extractValueOrZero(findNextTextNodeValue($, guardDiv.find('span:contains("Holy")')));
            // @ts-ignore - Workaround for persistent Cheerio type issue
            weaponData.boostGuard = extractValueOrZero(findNextTextNodeValue($, guardDiv.find('span:contains("Boost")')));
        }

        // --- Scaling --- Find the correct td and div
        const scalingTd = infobox.find('img[title="Attribute Scaling"]').closest('td');
        const scalingDiv = scalingTd.find('div.lineleft');
        const scalingText = scalingDiv.text(); // Get text of the whole div for regex matching
        weaponData.strScale = extractScaling(scalingText, 'Str');
        weaponData.dexScale = extractScaling(scalingText, 'Dex');
        weaponData.intScale = extractScaling(scalingText, 'Int');
        weaponData.faiScale = extractScaling(scalingText, 'Fai');
        weaponData.arcScale = extractScaling(scalingText, 'Arc');

        // --- Requirements --- Find the correct td and div
        const requiresTd = infobox.find('img[title="Attributes Requirement"]').closest('td');
        const requiresDiv = requiresTd.find('div.lineleft');
        const requiresText = requiresDiv.text(); // Get text of the whole div for regex matching
        weaponData.strReq = extractRequirement(requiresText, 'Str');
        weaponData.dexReq = extractRequirement(requiresText, 'Dex');
        weaponData.intReq = extractRequirement(requiresText, 'Int');
        weaponData.faiReq = extractRequirement(requiresText, 'Fai');
        weaponData.arcReq = extractRequirement(requiresText, 'Arc');

        // --- Category, Damage Type, Skill, FP Cost, Weight, Passive --- Iterate through rows
        // Resetting temp vars
        let category = '-';
        let damageTypes = '-';
        let weaponSkill = '-';
        let fpCost = '-';
        let weight = '-';
        let generalPassive = '-'; // Renamed to avoid conflict

        // Log ALL rows before filtering
        // infobox.find('tr').each((i, tr) => {
        //     console.log(`  [Debug] Pre-Filter Row ${i} HTML: ${$(tr).html()?.replace(/\n\s*/g, '')}`); // Log cleaned HTML
        // });

        // Select only the rows *after* the scaling/requirements rows, identified by not having an img child
        infobox.find('tr').each((_, tr) => {
            const tds = $(tr).find('td');
            if (tds.length === 2) {
                const td1 = $(tds[0]);
                const td2 = $(tds[1]);
                const td1Text = td1.text().trim();
                const td2Text = td2.text().trim();
                // console.log(`  [Debug] Row Scan -> td1: "${td1Text}" | td2: "${td2Text}"`); // Existing DEBUG LOG

                // NEW: Explicitly skip Attack/Guard and Scaling/Req rows
                if (td1Text.startsWith('Attack') || td1Text.startsWith('Scaling')) {
                    // console.log(`    [Debug] Skipping known header row (Attack/Scaling).`);
                    return; // Skip this iteration in .each()
                }

                // Prioritize Weight/Passive check
                if (td1Text.startsWith('Wgt.')) {
                    // Weight & Passive Row
                    weight = extractValueOrZero(td1Text) || '-';
                    // console.log(`  [Debug]: ${td2}`);
                    // Call extractPassive, passing the Cheerio instance '$'
                    generalPassive = extractPassive($, td2) || '-';

                    // Extract specific status effect values from td2
                    const statusEffects = [
                        { key: 'poison', titleTerm: 'Poison' },
                        { key: 'hemorrhage', titleTerm: 'Hemorrhage' }, // Check wiki for exact title term if needed
                        { key: 'frostbite', titleTerm: 'Frostbite' },
                        { key: 'scarletRot', titleTerm: 'Scarlet Rot' },
                        { key: 'sleep', titleTerm: 'Sleep' },
                        { key: 'madness', titleTerm: 'Madness' },
                        { key: 'deathBlight', titleTerm: 'Death Blight' } // Check wiki for exact title term if needed
                    ] as const; // Use 'as const' for stronger typing of key

                    statusEffects.forEach(effect => {
                        const link = td2.find(`a[title*="${effect.titleTerm}"]`);
                        if (link.length) {
                            const linkText = link.text(); // e.g., "(66)"
                            const valueMatch = linkText.match(/\((\d+)\)/);
                            weaponData[effect.key] = (valueMatch && valueMatch[1]) ? valueMatch[1] : 'ERR'; // Use 'ERR' if value not found in expected format
                        } else {
                           weaponData[effect.key] = '-'; // No link found for this effect
                        }
                    });
                    // console.log(`    [Debug] Identified as Weight/Passive Row. Weight: ${weight}, Passive: ${passive}`); // Existing DEBUG LOG
                }
                // Then Skill/FP check
                else if (td2Text?.includes('FP') || td1Text === 'No Skill') {
                    // Skill & FP Cost Row
                    if (td1Text === 'No Skill') {
                        weaponSkill = 'No Skill';
                    } else {
                         // Use link text if available, otherwise full text
                        weaponSkill = td1.find('a').text().trim() || td1Text || '-';
                    }
                    // Extract FP cost, defaulting to 0 if only "FP -" is present
                    fpCost = extractValueOrZero(td2Text);
                    // console.log(`    [Debug] Identified as Skill/FP Row. Skill: ${weaponSkill}, FP Cost: ${fpCost}`);
                }
                // Only if others fail AND category is not set, assume Category/Damage
                else if (category === '-') { // Removed the td1.find('a').length check
                     // Assume Category & Damage Type Row
                     // Use link text if available, otherwise full text
                    category = td1.find('a').text().trim() || td1Text || '-';
                    damageTypes = td2.find('a').map((_, el) => $(el).text().trim()).get().join('/') || '-';
                    // Fallback if no links in td2
                    if (damageTypes === '-' && td2Text) { // Added check for td2Text
                       // @ts-ignore - Linter seems overly cautious here
                       damageTypes = td2Text.split('\n')[0].trim().split('/').map(s => s.trim()).join('/') || '-';
                    }
                    // console.log(`    [Debug] Identified as Category/Damage Row. Category: ${category}, Damage Types: ${damageTypes}`);
                } else {
                    // Log rows that don't match the specific patterns or if category was already found
                    // console.log(`    [Debug] Row skipped (td1: "${td1Text}", td2: "${td2Text}") - Not Weight/Skill/FP and Category already found or pattern mismatch.`);
                }
            } else {
                // Log rows skipped because they don't have 2 cells (like header, image, etc.)
                // console.log(`  [Debug] Skipping row processing because it has ${tds.length} cell(s).`);
            }
        });

        // Assign the extracted values
        weaponData.category = category.endsWith('s') ? category.slice(0, -1) : category;
        weaponData.damageTypes = damageTypes;
        weaponData.weaponSkill = weaponSkill;
        weaponData.fpCost = fpCost;
        weaponData.weight = weight;
        weaponData.passive = generalPassive; // Assign general passive text here

        // console.log(`  [Debug] Category: ${category}, DamageTypes: ${damageTypes}, Skill: ${weaponSkill}`); // DEBUG LOG

        // --- Upgrade Type --- Target specific list items or divs containing the upgrade text
        let upgradeType: WeaponData['upgradeType'] = 'Unknown';
        // Select li elements containing the core upgrade material names
        const upgradeInfoElements = $('li:contains("Smithing Stones"), li:contains("Somber")');

        if (upgradeInfoElements.length > 0) {
            const upgradeText = upgradeInfoElements.first().text();
            // Check for Somber first as "Somber Smithing Stones" includes "Smithing Stones"
            if (upgradeText.includes('Somber')) {
                upgradeType = 'Somber';
            } else if (upgradeText.includes('Smithing Stones')) {
                upgradeType = 'Regular';
            }
        } else {
            // Fallback: Check common divs if li not found (less reliable)
            const bodyText = $('#wiki-content-block').text(); // Search within main content
             // Check for phrases indicating upgrade type in the broader text
             if (bodyText.includes('using Somber')) { // Covers "can be upgraded using Somber" and "Upgraded using Somber"
                upgradeType = 'Somber';
            } else if (bodyText.includes('using Smithing')) { // Covers "can be upgraded using Smithing" and "Upgraded using Smithing"
                upgradeType = 'Regular';
            }
        }
        weaponData.upgradeType = upgradeType;

        return weaponData as WeaponData;

    } catch (error: any) { // Explicitly type error as any
        console.error(`Error scraping ${weaponUrl}:`, error.message);
        return null;
    }
}

// Function to get all weapon links from the main weapons page
async function getAllWeaponLinks(url: string): Promise<string[]> {
    try {
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);
        const links = new Set<string>(); // Use Set for automatic deduplication

        // Define known non-weapon paths to exclude
        const knownNonWeaponPaths = [
            '/Weapons', '/Shields', '/Armor', '/Talismans', '/Ashes+of+War',
            '/Spells', '/Incantations', '/Sorceries', '/Consumables', '/Crafting',
            '/Map', '/Bosses', '/Walkthrough', '/New+Game+Plus', '/Game+Progress+Route',
            '/Side+Quests', '/Endings', '/Upgrades',
            // Attributes are handled separately, but add them here for completeness if needed elsewhere
            '/Strength', '/Dexterity', '/Intelligence', '/Faith', '/Arcane',
             // Add other known general pages if necessary
             '/Combat+Mechanics', '/Status+Effects', '/Equipment',
             '/Online', '/Player+vs+Player+PvP', '/Messages',
             '/Spirit+Ashes' // Example, adjust as needed based on observed filtered links
        ];


        // Select links similar to the working script
        $('#wiki-content-block a.wiki_link.wiki_tooltip').each((_, element) => {
            const href = $(element).attr('href');
            const text = $(element).text().trim();

            // Updated simple path regex to allow apostrophes
            const isSimplePath = href && /^\/[A-Za-z0-9-+'\+\(\)\_]+$/.test(href);
            const isAttributePage = href && ['/Strength', '/Dexterity', '/Intelligence', '/Faith', '/Arcane'].includes(href);
            // Updated check using the exclusion list
            const isNonWeaponPage = href && knownNonWeaponPaths.includes(href);


            // Apply filtering
            if (href && isSimplePath && !isAttributePage && !isNonWeaponPage) {
                 // Construct full URL, ensuring no double base URLs
                 const fullUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`;
                 links.add(fullUrl);
            } else {
                 // Updated logging for filtered out links
                 let filterReason = [];
                 if (!href) filterReason.push("no href");
                 if (href && !isSimplePath) filterReason.push("not simple path"); // Check href exists before isSimplePath
                 if (isAttributePage) filterReason.push("is attribute page");
                 if (isNonWeaponPage) filterReason.push("is non-weapon page");
                 // Only log if there's a reason and href exists
                 if (href && filterReason.length > 0) {
                    console.log(`  Filtered out: href="${href}", text="${text}", Reason: ${filterReason.join(', ')}`);
                 } else if (!href) {
                    // Log if href itself is missing
                     console.log(`  Filtered out: text="${text}", Reason: no href`);
                 }
            }
         });

        const foundLinks = Array.from(links);
        console.log(`Found ${foundLinks.length} potential weapon links.`);
        return foundLinks;
    } catch (error: any) { // Explicitly type error as any
        console.error(`Error fetching weapon list from ${url}:`, error.message);
        return [];
    }
}

// Function to write data to CSV, ensuring correct column order
function writeToCsv(data: WeaponData) {
    const headers: (keyof WeaponData)[] = [
        'name', 'category', 'phyAtk', 'magAtk', 'fireAtk', 'ligtAtk', 'holyAtk', 'critAtk', 'sorAtk', 'incAtk',
        'phyGuard', 'magGuard', 'fireGuard', 'ligtGuard', 'holyGuard', 'boostGuard',
        'strScale', 'dexScale', 'intScale', 'faiScale', 'arcScale',
        'strReq', 'dexReq', 'intReq', 'faiReq', 'arcReq',
        'damageTypes', 'weaponSkill', 'fpCost', 'weight', 'passive',
        // Add new passive columns here
        'poison', 'hemorrhage', 'frostbite', 'scarletRot', 'sleep', 'madness', 'deathBlight',
        'upgradeType', 'url'
    ];
    const values = headers.map(header => {
        const value = data[header];
        // Ensure value is string, handle null/undefined/empty, escape double quotes
        return `"${String(value ?? '-').replace(/"/g, '""')}"`;
    }).join(',');

    try {
        if (!fs.existsSync(CSV_FILE_PATH)) {
            // Write header only if file doesn't exist
            fs.writeFileSync(CSV_FILE_PATH, headers.join(',') + '\n', 'utf8');
        }
        // Append values
        fs.appendFileSync(CSV_FILE_PATH, values + '\n', 'utf8');
    } catch (error: any) { // Explicitly type error as any
        console.error(`Error writing to CSV file ${CSV_FILE_PATH}:`, error.message);
    }
}

// Main scraping function
async function main() {
    // Delete old CSV file content if it exists
    try {
        if (fs.existsSync(CSV_FILE_PATH)) {
            fs.unlinkSync(CSV_FILE_PATH);
            console.log(`Deleted old ${CSV_FILE_PATH}`);
        }
    } catch (error: any) { // Explicitly type error as any
        console.error(`Error deleting old CSV file ${CSV_FILE_PATH}:`, error.message);
        // Decide if you want to continue or exit if deletion fails
        // return; // Uncomment to exit if deletion fails
    }

    const allWeaponLinks = await getAllWeaponLinks(WEAPONS_LIST_URL);
    let linksToProcess: string[] = [];
    let logMessage = "";

    // Apply slicing based on HEAD_INDEX and TAIL_INDEX first
    if (HEAD_INDEX > 0 && TAIL_INDEX > 0 && TAIL_INDEX >= HEAD_INDEX) {
        // Adjust for 0-based index and slice exclusivity
        const startIndex = HEAD_INDEX - 1;
        const endIndex = TAIL_INDEX; // slice extracts up to, but not including, endIndex
        linksToProcess = allWeaponLinks.slice(startIndex, endIndex);
        logMessage = `Starting scrape of weapons from index ${HEAD_INDEX} to ${TAIL_INDEX} (inclusive)...`;
    }
    // Fallback to MAX_WEAPONS_TO_SCRAPE if head/tail not used
    else if (MAX_WEAPONS_TO_SCRAPE > -1) {
        linksToProcess = allWeaponLinks.slice(0, MAX_WEAPONS_TO_SCRAPE);
        logMessage = `Starting scrape of the first ${linksToProcess.length} weapons (max set to ${MAX_WEAPONS_TO_SCRAPE})...`;
    }
    // Default to all links
    else {
        linksToProcess = allWeaponLinks;
        logMessage = `Starting scrape of all ${linksToProcess.length} weapons...`;
    }

    if (linksToProcess.length === 0) {
        console.error("No weapon links to process based on the specified criteria. Exiting.");
        return;
    }

    console.log(logMessage); // Use the determined log message

    let scrapedCount = 0;
    for (const [index, link] of linksToProcess.entries()) {
        const weaponData = await scrapeWeaponData(link, index + 1);
        if (weaponData) {
            writeToCsv(weaponData); // Append data row
            scrapedCount++;
             // Optional: Add a small delay to avoid overwhelming the server
             await new Promise(resolve => setTimeout(resolve, 50)); // 50ms delay
        } else {
             console.log(`Skipping write for ${link} due to missing data or error.`);
        }
    }

    console.log(`Scraping finished. Scraped ${scrapedCount} weapons. Data saved to ${CSV_FILE_PATH}`);
}

main().catch(error => {
    console.error("An unexpected error occurred during the main execution:", error);
});

