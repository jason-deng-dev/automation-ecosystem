import "dotenv/config";
import path from "node:path";
import express, { Request, Response } from "express";

const app = express();

const assetsPath = path.join(__dirname, "public");
app.use(express.static(assetsPath));
app.use(express.urlencoded({ extended: true }));

app.get("/", (req: Request, res: Response) => res.send("Running"));

app.listen(process.env.PORT!, () => {
	console.log(`Server running on port ${process.env.PORT}`);
});
