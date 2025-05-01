import axios from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = 'https://eldenring.wiki.fextralife.com';
const SPELLS_LIST_URL = `${BASE_URL}/Magic+Spells`;
const CSV_FILE_PATH = path.join(__dirname, 'spells.csv');

interface SpellData {
    name: string;
    category: string; // Sorcery or Incantation (from breadcrumbs)
    type: string;     // e.g., Glintstone Sorceries (from infobox)
    fpCost: string;
    slotsUsed: string;
    intReq: string;
    faiReq: string;
    arcReq: string;
    url: string;
}

// Helper function to safely extract text, returning '-' if not found or empty
const safeExtractText = ($: cheerio.CheerioAPI, selector: string, context?: cheerio.Element): string => {
    const element = context ? $(selector, context) : $(selector);
    const text = element.text().trim();
    return text || '-';
};

// Helper function to extract numerical value from text, handling various formats
const extractValue = (text: string): string => {
    // Matches integers or FP cost like (12) or -
    const match = text.match(/(\d+)|(\(\d+\))|(-)/);
    if (match) {
        // Return the number found inside parentheses or the number itself, or '-'
        return match[1] || match[2]?.replace(/[()]/g, '') || match[3] || '-';
    }
    return '-';
};


// Helper function to extract requirement value
const extractRequirement = (text: string, type: 'Intelligence' | 'Faith' | 'Arcane'): string => {
    const reqRegex = new RegExp(`${type}\\s+(\\d+)`); // Requirement (number)
    const match = text.match(reqRegex);
    const value = match ? (match[1] ?? '0') : '0'; // Default to 0 if not found
    // Ensure '-' is returned if the value is explicitly 0 after extraction, common in the wiki
    return value === '0' ? '-' : value;
};

// Function to scrape data for a single spell
async function scrapeSpellData(spellUrl: string): Promise<SpellData | null> {
    try {
        const fullUrl = spellUrl.startsWith('http') ? spellUrl : `${BASE_URL}${spellUrl}`;
        console.log(`Scraping: ${fullUrl}`);
        const { data } = await axios.get(fullUrl);
        const $ = cheerio.load(data);

        const infobox = $('#infobox');
        if (!infobox.length) {
            console.warn(`Could not find infobox for ${fullUrl}`);
            return null;
        }

        const spellData: Partial<SpellData> = { url: fullUrl };

        // Spell Name
        spellData.name = infobox.find('h2').first().text().trim();
        if (!spellData.name) {
            console.warn(`Could not find name for ${fullUrl}`);
            return null; // Skip if name is missing
        }

        // Spell Category (from breadcrumbs)
        const breadcrumbs = $('#breadcrumbs-container a');
        const categoryLink = breadcrumbs.filter((i, el) => {
             const href = $(el).attr('href');
             return href === '/Sorceries' || href === '/Incantations';
        }).last(); // Take the last one (Sorceries or Incantations)
        spellData.category = categoryLink.text().trim() || '-';


        // --- Infobox Data ---
        spellData.type = '-';
        spellData.fpCost = '-';
        spellData.slotsUsed = '-';
        spellData.intReq = '-';
        spellData.faiReq = '-';
        spellData.arcReq = '-';


        infobox.find('tr').each((_, tr) => {
            const ths = $(tr).find('th');
            const tds = $(tr).find('td');

            // Type (e.g., "Glintstone Sorceries")
            if (tds.length === 2 && $(tds[0]).text().trim() === 'Spell Type') {
                 spellData.type = $(tds[1]).text().trim() || '-';
            }

            // FP Cost and Slots Used (often in the same row)
             if (tds.length === 2) {
                const td1Text = $(tds[0]).text().trim();
                const td2Text = $(tds[1]).text().trim();

                 if (td1Text.startsWith('FP Cost')) {
                     spellData.fpCost = extractValue(td1Text) || '-';
                 }
                 if (td2Text.startsWith('Slots Used')) {
                     spellData.slotsUsed = extractValue(td2Text) || '-';
                 }
             }

            // Requirements
            if (tds.length === 1 || tds.length === 2) { // Handle cases where requirements are in a single cell or spread across two
                 const cellWithRequirements = tds.length === 1 ? $(tds[0]) : $(tds[1]); // Check second cell first if two exist
                 const reqImg = cellWithRequirements.find('img[title="Attributes Requirement"], img[alt*="attributes required"]'); // More robust selector for req image
                 if (reqImg.length > 0) {
                     const reqText = cellWithRequirements.text(); // Get text of the container TD
                     spellData.intReq = extractRequirement(reqText, 'Intelligence');
                     spellData.faiReq = extractRequirement(reqText, 'Faith');
                     spellData.arcReq = extractRequirement(reqText, 'Arcane');
                 } else if (tds.length === 2 && $(tds[0]).find('img[title="Attributes Requirement"], img[alt*="attributes required"]').length > 0) {
                     // Check the first cell if the image was there
                     const reqText = $(tds[0]).text();
                     spellData.intReq = extractRequirement(reqText, 'Intelligence');
                     spellData.faiReq = extractRequirement(reqText, 'Faith');
                     spellData.arcReq = extractRequirement(reqText, 'Arcane');
                 }
            }
        });


        // Fallback/Refinement for FP Cost/Slots if not found above (structure varies)
        if (spellData.fpCost === '-' || spellData.slotsUsed === '-') {
             const possibleRow = infobox.find('td:contains("FP Cost"), th:contains("FP Cost")').closest('tr');
             if (possibleRow.length) {
                 const cells = possibleRow.find('td');
                 cells.each((_, cell) => {
                     const text = $(cell).text().trim();
                     if (text.startsWith('FP Cost')) {
                         spellData.fpCost = extractValue(text) || '-';
                     }
                     if (text.startsWith('Slots Used')) {
                         spellData.slotsUsed = extractValue(text) || '-';
                     }
                 });
             }
        }


        // Ensure all fields are set, default to '-'
        return {
            name: spellData.name,
            category: spellData.category ?? '-',
            type: spellData.type ?? '-',
            fpCost: spellData.fpCost ?? '-',
            slotsUsed: spellData.slotsUsed ?? '-',
            intReq: spellData.intReq ?? '-',
            faiReq: spellData.faiReq ?? '-',
            arcReq: spellData.arcReq ?? '-',
            url: spellData.url,
        } as SpellData;

    } catch (error: any) {
        console.error(`Error scraping ${spellUrl}:`, error.message);
        if (error.response) {
            console.error('Response Status:', error.response.status);
        }
        return null;
    }
}

// Function to get all spell links from the main spells page
async function getAllSpellLinks(url: string): Promise<string[]> {
    try {
        console.log(`Fetching spell list from: ${url}`);
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);
        const links = new Set<string>();

        // Find links within the main content tables likely containing spells
        $('#wiki-content-block .wiki_table a.wiki_link').each((_, element) => {
            const href = $(element).attr('href');
            const text = $(element).text().trim();

            // Basic filtering: needs to be a valid link, not to an image/file,
            // not an anchor link, and likely a direct child path from BASE_URL
             if (href && href.startsWith('/') && !href.includes('.') && !href.startsWith('/#') && href.split('/').length === 2) {
                // Exclude known non-spell links if necessary (e.g., category links)
                 if (href !== '/Sorceries' && href !== '/Incantations' && href !== '/Memory+Slots') {
                     const fullUrl = `${BASE_URL}${href}`;
                     if (!links.has(fullUrl)) { // Check uniqueness before logging
                         // console.log(`  Found potential spell link: ${fullUrl} (${text})`);
                         links.add(fullUrl);
                     }
                 }
            }
        });

        const foundLinks = Array.from(links);
        console.log(`Found ${foundLinks.length} potential spell links.`);
        return foundLinks;
    } catch (error: any) {
        console.error(`Error fetching spell list from ${url}:`, error.message);
        return [];
    }
}

// Function to write data to CSV
function writeToCsv(data: SpellData) {
    const headers = Object.keys(data).join(',');
    const values = Object.values(data).map(value => `"${String(value ?? '-').replace(/"/g, '""')}"`).join(',');

    try {
        // Check if file exists to decide whether to write headers
        if (!fs.existsSync(CSV_FILE_PATH)) {
            fs.writeFileSync(CSV_FILE_PATH, headers + '\\n', 'utf8');
        }
        // Append data
        fs.appendFileSync(CSV_FILE_PATH, values + '\\n', 'utf8');
    } catch (error: any) {
        console.error(`Error writing to CSV file ${CSV_FILE_PATH}:`, error.message);
    }
}

// Main scraping function
async function main() {
    console.log('Starting spell scraping process...');

    // Delete old CSV file content if it exists
    try {
        if (fs.existsSync(CSV_FILE_PATH)) {
            fs.unlinkSync(CSV_FILE_PATH);
            console.log(`Deleted old ${CSV_FILE_PATH}`);
        }
    } catch (error: any) {
        console.error(`Error deleting old CSV file ${CSV_FILE_PATH}:`, error.message);
        // return; // Optional: exit if deletion fails
    }

    const spellLinks = await getAllSpellLinks(SPELLS_LIST_URL);

    if (spellLinks.length === 0) {
        console.error("No spell links found. Exiting.");
        return;
    }

    console.log(`Starting scrape of ${spellLinks.length} spells...`);

    // Write header row explicitly after potential deletion and link fetching
    if (spellLinks.length > 0) {
        const dummyData: SpellData = {
            name: '', category: '', type: '', fpCost: '', slotsUsed: '',
            intReq: '', faiReq: '', arcReq: '', url: ''
        };
        try {
            fs.writeFileSync(CSV_FILE_PATH, Object.keys(dummyData).join(',') + '\\n', 'utf8');
            console.log(`Created CSV header in ${CSV_FILE_PATH}`);
        } catch (error: any) {
            console.error(`Error writing CSV header to ${CSV_FILE_PATH}:`, error.message);
            return; // Exit if header cannot be written
        }
    }

    let scrapedCount = 0;
    let errorCount = 0;
    for (const link of spellLinks) {
        try {
            const spellData = await scrapeSpellData(link);
            if (spellData) {
                writeToCsv(spellData);
                scrapedCount++;
                // Add a small delay to be polite to the server
                await new Promise(resolve => setTimeout(resolve, 50)); // 50ms delay
            } else {
                 console.log(`Skipping write for ${link} due to missing data or scraping error.`);
                 errorCount++;
            }
        } catch (scrapeError: any) {
             console.error(`Unhandled error during scraping or writing for ${link}:`, scrapeError.message);
             errorCount++;
             // Optional: add delay even on error
             await new Promise(resolve => setTimeout(resolve, 50));
        }
    }

    console.log(`\nScraping finished.`);
    console.log(`Successfully scraped: ${scrapedCount} spells.`);
    if (errorCount > 0) {
        console.log(`Failed or skipped: ${errorCount} spells.`);
    }
    console.log(`Data saved to ${CSV_FILE_PATH}`);
}

main().catch(error => {
    console.error("An unexpected error occurred during the main execution:", error);
});
