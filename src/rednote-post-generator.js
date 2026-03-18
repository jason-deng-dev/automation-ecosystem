import 'dotenv/config';
import fs from 'fs';
import Anthropic from '@anthropic-ai/sdk';

async function generatePosts(amount, type) {
	const client = new Anthropic({
		apiKey: process.env['ANTHROPIC_API_KEY'],
	});

	const prompts = JSON.parse(fs.readFileSync('./config/prompts.json', 'utf-8'));
	let systemPrompt = prompts.systemPrompt;
	let raceContext = prompts.postTypes.raceGuide;
	let trainingContext = prompts.postTypes.training;
	let nutritionSupplementContext = prompts.postTypes.nutritionSupplement;

    // generate type 



	const message = await client.messages.create({
		max_tokens: 1024,
		messages: [{ role: 'user', content: 'Hello, Claude' }],
		model: 'claude-opus-4-6',
	});

	console.log(message.content);
}
