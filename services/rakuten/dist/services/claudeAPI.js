"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateKeyword = validateKeyword;
require("dotenv/config");
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const queries_1 = require("../db/queries");
// validate keyword, and respond with what subcategory id it belongs to
async function validateKeyword(keywordZH) {
    const subcategories = await (0, queries_1.getSubcategoriesWithCategory)(); //{id, name, category name}
    const anthropic = new sdk_1.default();
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
        if (block.text == "null") {
            return null;
        }
        return Number(block.text);
    }
    return null;
}
