import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import { getSubcategoriesWithCategory } from "../db/queries";

// validate keyword, and respond with what subcategory id it belongs to
export async function validateKeyword(keywordZH: string) {
	const subcategories = await getSubcategoriesWithCategory(); //{id, name, category name}
	const anthropic = new Anthropic();
	let prompt = `Does this keyword: ${keywordZH} belong in the subcategories list that I gave you?
	If so return with the subcategory id it belongs to, if not return null
	
	Return only the ID or Null, no explanation
	
	Subcategory format: (id/subcategoryName/categoryName)
	`;

	subcategories.forEach((obj) => {
		prompt += `(${obj.subcategoryId}-${obj.subcategoryName}-${obj.categoryName}) \n`;
	});

	const res = await anthropic.messages.create({
		model: "claude-haiku-4-5-20251001",
		max_tokens: 1000,
		messages: [
			{
				role: "user",
				content: prompt,
			},
		],
	});

	const block = res.content[0];
	if (block.type == "text") {
		if (block.text == "null"){
			return null
		} 
		return Number(block.text);
	}
	return null
}


