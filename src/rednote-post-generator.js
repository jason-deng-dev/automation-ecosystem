import 'dotenv/config';
import fs from 'fs';
import Anthropic from '@anthropic-ai/sdk';

const prompts = JSON.parse(fs.readFileSync('./config/prompts.json', 'utf-8'));
const client = new Anthropic({
	apiKey: process.env['ANTHROPIC_API_KEY'],
});

async function generatePosts(amount, type) {
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
		raceStr += race.name + '|||';
	}
	// const post_history = JSON.parse(fs.readFileSync('./data/post_history.json', 'utf-8'));
	// filter races that are in post_history

	let systemRaceSelectionPrompt = prompts.systemRaceSelectionPrompt;
	let systemRaceSelectionPromptTest = prompts.systemRaceSelectionPromptTest;
	let contextChooseRace = prompts.contextRaceSelection + raceStr;

	console.log('System Prompt: ' + systemRaceSelectionPromptTest);
	console.log('Race Context: ' + contextChooseRace);

	const raceSelection = await client.messages.create({
		max_tokens: 1024,
		system: systemRaceSelectionPromptTest,
		messages: [{ role: 'user', content: contextChooseRace }],
		model: 'claude-sonnet-4-6',
	});

	console.log(raceSelection)

	// const raceChosen = raceSelection.content[0].text;

	// return races.find((race) => race.name === raceChosen);
}

chooseRace();

const raceSelectRes = `{
  model: 'claude-sonnet-4-6',
  id: 'msg_01APGyW5SCBSYi16ddgGvKvo',
  type: 'message',
  role: 'assistant',
  content: [
        {
      type: 'text',
      text: "**The 5th Mt. Fuji Sanroku Women's Trail Run**\n" +
        '\n' +
        '**Reasoning:**\n' +
        '\n' +
        'This race wins on almost every selection criterion:\n' +
        '\n' +
        '---\n' +
        '\n' +
        '**1. Search Intent / Name Recognition**\n' +
        '"富士山" (Mt. Fuji) is the single highest-value keyword in the Japanese travel + running space for Chinese audiences. It requires zero explanation — the name alone stops the scroll. No other race on this list has a comparable anchor keyword.\n' +
        '\n' +
        '---\n' +
        '\n' +
        '**2. Strong Differentiation**\n' +
        "The women-only angle is a powerful content hook. It creates immediate identity resonance with a large and growing segment of Rednote's core demographic (women aged 25–35 who run). Women-only races in Japan are relatively rare and feel special/exclusive — that's storytelling gold.\n" +
        '\n' +
        '---\n' +
        '\n' +
        '**3. Travel Appeal**\n' +
        'Mt. Fuji + trail run = a complete Japan trip narrative. The Sanroku (foothills) setting means scenic content with iconic backdrops. Chinese runners can frame it as "running at the foot of Fuji" — aspirational and photogenic.\n' +
        '\n' +
        '---\n' +
        '\n' +
        '**4. Content Potential**\n' +
        '- Hook writes itself: *"在富士山脚下，和一群女生一起跑步是什么体验？"*\n' +
        '- Supports comparison posts, packing guides, costume content\n' +
        "- Women-only races encourage community/squad travel framing — perfect for Rednote's social format\n" +
        '\n' +
        '---\n' +
        '\n' +
        '**Why not the others:**\n' +
        '- Tohoku Food Marathon, Higashine Sakuranbo — niche, low name recognition\n' +
        '- Sado, Rishiri, Echigo — too obscure geographically for mass appeal\n' +
        '- Okinawa Ekiden — relay format limits individual runner identification\n' +
        "- Ueda Vertical / Fuji Oshino Trail — weaker branding vs. the Fuji Sanroku Women's frame"
        }
    ],
  stop_reason: 'end_turn',
  stop_sequence: null,
  usage: {
    input_tokens: 439,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 0,
    cache_creation: { ephemeral_5m_input_tokens: 0, ephemeral_1h_input_tokens: 0
        },
    output_tokens: 434,
    service_tier: 'standard',
    inference_geo: 'global'
    }
}`
