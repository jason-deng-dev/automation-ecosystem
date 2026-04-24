import { generatePost } from "../src/generator.js";
import { insertPostArchive } from "../src/db/queries.js";

const type = process.argv[2] ? process.argv[2] : 'race';

const post = await generatePost(type);

await insertPostArchive({
	postType: post.post_type,
	raceName: post.race_name,
	title: post.title,
	hook: post.hook,
	contents: post.contents,
	cta: post.cta,
	description: post.description,
	hashtags: post.hashtags,
	comments: post.comments,
	inputTokens: post.input_tokens,
	outputTokens: post.output_tokens,
	published: false,
});

console.log(JSON.stringify(post));
