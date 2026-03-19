import 'dotenv/config';
import fs from 'fs';
import Anthropic from '@anthropic-ai/sdk';

const prompts = JSON.parse(fs.readFileSync('./config/prompts.json', 'utf-8'));
const races = JSON.parse(fs.readFileSync('./data/races.json', 'utf-8'));
const client = new Anthropic({
	apiKey: process.env['ANTHROPIC_API_KEY'],
});

async function generatePosts(type) {
	const systemPrompt = prompts.systemPrompt;
	let contextToUse;

	switch (type) {
		case 'race':
			let raceContext = prompts.postTypes.raceGuide;
			const raceChosen = await chooseRaceMock();
			const race = races.races.find((item) => item.name === raceChosen);
			// const { name, date, location, entryStart, entryEnd, registrationOpen, registrationUrl, website, description } =
			// 	race;
			const fields = ['name', 'date', 'location', 'entryStart', 'entryEnd', 'registrationOpen', 'registrationUrl', 'website', 'description']
			for (const field of fields) {
				raceContext = raceContext.replace(`race.${field}`, race[field])
			}
			contextToUse = raceContext;
			break;
		case 'training':
			const trainingContext = prompts.postTypes.training;
			contextToUse = trainingContext;
			break;
		case 'nutritionSupplement':
			const nutritionSupplementContext = prompts.postTypes.nutritionSupplement;

			contextToUse = nutritionSupplementContext;
			break;
		default:
			throw new Error('Incorrect type used');
	}

	const message = await client.messages.create({
		max_tokens: 1024,
		system: systemPrompt,
		messages: [{ role: 'user', content: contextToUse }],
		model: 'claude-sonnet-4-6',
	});

	console.log(message);
	return message
}

async function chooseRace() {
	let raceStr = '';
	for (const race of races.races) {
		raceStr += race.name + '|||';
	}
	// const post_history = JSON.parse(fs.readFileSync('./data/post_history.json', 'utf-8'));
	// filter races that are in post_history

	let systemRaceSelectionPrompt = prompts.systemRaceSelectionPrompt;
	let contextChooseRace = prompts.contextRaceSelection + raceStr;
	const raceSelection = await client.messages.create({
		max_tokens: 1024,
		system: systemRaceSelectionPrompt,
		messages: [{ role: 'user', content: contextChooseRace }],
		model: 'claude-sonnet-4-6',
	});
	return raceSelection.content[0].text;
}

function chooseRaceMock() {
	return "The 5th Mt. Fuji Sanroku Women's Trail Run";
}

// generatePosts('race');
