import axios from 'axios'
import * as cheerio from 'cheerio'
import * as fs from 'fs'

interface WeaponRequirements {
	strength: number
	dexterity: number
	intelligence: number
	faith: number
	arcane: number
}

async function fetchWeaponPages(): Promise<Array<string>> {
	console.log('Fetching weapon list page...')
	const url = 'https://eldenring.wiki.fextralife.com/Weapons'
	const { data } = await axios.get(url)
	console.log('Parsing weapon list page...')
	const $ = cheerio.load(data)
	const links = new Set<string>()
	const selectedElements = $('#wiki-content-block a.wiki_link.wiki_tooltip')
	console.log(`Initial selection found ${selectedElements.length} elements. Filtering...`)
	selectedElements.each((_, el) => {
		const href = $(el).attr('href')
		const text = $(el).text().trim()
		const isSimplePath = href && /^\/[A-Za-z0-9-+'\+\(\)]+$/.test(href)
		const isAttributePage = href && ['/Strength', '/Dexterity', '/Intelligence', '/Faith', '/Arcane'].includes(href)

		if (href && isSimplePath && !isAttributePage) {
			links.add(`https://eldenring.wiki.fextralife.com${href}`)
		} else {
			// Log filtered out links
			if (!href) {
				console.log(`  Filtered out: No href found for element with text: "${text}"`);
			} else if (!isSimplePath) {
				console.log(`  Filtered out: Non-simple path "${href}" for element with text: "${text}"`);
			} else if (isAttributePage) {
				console.log(`  Filtered out: Attribute page "${href}" for element with text: "${text}"`);
			}
		}
	})
	const foundLinks = Array.from(links)
	console.log(`Found ${foundLinks.length} potential weapon pages.`)
	return foundLinks
}

async function parseRequirementsFromPage(pageUrl: string): Promise<WeaponRequirements | null> {
	console.log(`  Fetching weapon page: ${pageUrl}`)
	const { data } = await axios.get(pageUrl)
	console.log(`  Parsing weapon page: ${pageUrl}`)
	const $ = cheerio.load(data)
	const cell = $('td:has(img[alt*="attributes required"])')
	if (!cell.length) {
		console.log(`  No requirements table found for ${pageUrl}`)
		return null
	}
	const req: Partial<WeaponRequirements> = {}
	cell.find('a.wiki_link').each((_, el) => {
		const key = $(el).text().trim().toLowerCase()
		const node = $(el).get(0)
		const raw = node?.nextSibling?.nodeValue?.trim() || ''
		const val = parseInt(raw, 10)
		if (!isNaN(val)) {
			if (key === 'str') req.strength = val
			if (key === 'dex') req.dexterity = val
			if (key === 'int') req.intelligence = val
			if (key === 'fai') req.faith = val
			if (key === 'arc') req.arcane = val
		}
	})
	const result = {
		strength: req.strength || 0,
		dexterity: req.dexterity || 0,
		intelligence: req.intelligence || 0,
		faith: req.faith || 0,
		arcane: req.arcane || 0,
	}
	console.log(`  Parsed requirements for ${pageUrl}:`, result)
	return result
}

async function main(): Promise<void> {
	console.log('Starting scraper...')
	const pages = await fetchWeaponPages()
	const outputLines: string[] = []
	console.log(`Processing ${pages.length} weapon pages...`)
	let count = 0
	for (const url of pages) {
		count++
		const name = decodeURIComponent(url.split('/').pop() || '')
		console.log(`[${count}/${pages.length}] Processing: ${name}`)
		try {
			const stats = await parseRequirementsFromPage(url)
			if (stats) {
				const { strength, dexterity, intelligence, faith, arcane } = stats
				const total = strength + dexterity + intelligence + faith + arcane
				const formattedStats = [
					strength || '-',
					dexterity || '-',
					intelligence || '-',
					faith || '-',
					arcane || '-',
				].join('/')
				outputLines.push(`- [ ] ${name} (${formattedStats}) (${total})`)
				console.log(`✔ Successfully processed ${name}`)
			} else {
				console.log(`ℹ Skipped ${name} (no stats found or parsing issue)`)
			}
		} catch (error) {
			console.error(`❌ Error processing ${name} (${url}):`, error)
		}
	}
	console.log('Finished processing all pages.')

	const markdownOutput = outputLines.join('\n')
	const outputPath = 'weapon_requirements.md'
	fs.writeFileSync(outputPath, markdownOutput)
	console.log(`Results written to ${outputPath}`)
	console.log('Scraper finished.')
}

main().catch(error => {
	console.error('Unhandled error in main:', error)
	process.exit(1)
})
