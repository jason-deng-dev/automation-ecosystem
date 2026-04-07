import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import { getSubcategoriesWithCategory } from "../db/queries";

// validate keyword, and respond with what subcategory id it belongs to
export async function validateKeyword(keywordZH:string) {
    const subcategories = await getSubcategoriesWithCategory(); //{id, name, category name}

	const anthropic = new Anthropic();
	const res = await anthropic.messages.create({
		model: "claude-haiku-4-5-20251001",
		max_tokens: 1000,
		messages: [
			{
				role: "user",
				content: "What should I search for to find the latest developments in renewable energy?",
			},
		],
	});

    return 12452
}
