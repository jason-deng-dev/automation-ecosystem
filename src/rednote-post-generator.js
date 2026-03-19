import 'dotenv/config';
import fs from 'fs';
import Anthropic from '@anthropic-ai/sdk';

const prompts = JSON.parse(fs.readFileSync('./config/prompts.json', 'utf-8'));

async function generatePosts(amount, type) {
	const client = new Anthropic({
		apiKey: process.env['ANTHROPIC_API_KEY'],
	});
	let systemPrompt = prompts.systemPrompt;
	let raceContext = prompts.postTypes.raceGuide;
	let trainingContext = prompts.postTypes.training;
	let nutritionSupplementContext = prompts.postTypes.nutritionSupplement;
	let contextToUse;
	let raceInfo;

	switch (type) {
		case 'race':
			contextToUse = raceContext;
			raceInfo = await chooseRace();
			break;
		case 'training':
			contextToUse = trainingContext;
			break;
		case 'nutritionSupplement':
			contextToUse = nutritionSupplementContext;
			break;
		default:
			throw new Error('Incorrect type used');
	}

	// generate type
	const message = await client.messages.create({
		max_tokens: 1024,
		system: systemPrompt,
		messages: [{ role: 'user', content: contextToUse }],
		model: 'claude-sonnet-4-6',
	});

	console.log(message.content);
}

async function chooseRace() {
	const races = JSON.parse(fs.readFileSync('./data/races.json', 'utf-8'));
	let raceStr = '';
	for (const race of races.races) {
		
		raceStr += race.name + '|||'
	}
	console.log(raceStr)

	// const post_history = JSON.parse(fs.readFileSync('./data/post_history.json', 'utf-8'));
	// filter races that are in post_history

	let systemRaceSelectionPrompt = prompts.systemRaceSelectionPrompt;
	let contextChooseRace = prompts.contextRaceSelection;

	console.log('System Prompt: '+ systemRaceSelectionPrompt)
	console.log('Race Context: ' + contextChooseRace)

	// const raceSelection = await client.messages.create({
	// 	max_tokens: 1024,
	// 	system: systemRacePrompt,
	// 	messages: [{ role: 'user', content: contextChooseRace }],
	// 	model: 'claude-sonnet-4-6',
	// });

	// const raceChosen = raceSelection.content[0].text;

	// return races.find((race) => race.name === raceChosen);
}

chooseRace()

