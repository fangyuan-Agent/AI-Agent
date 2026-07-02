import dotenv from "dotenv"; // 加载环境变量
import {ChatOpenAI} from "@langchain/openai";
dotenv.config(); // 加载环境变量
const model = new ChatOpenAI({
  model: process.env.MODEL_NAME || "qwen-coder-turbo",
  apiKey: process.env.MODEL_API_KEY,
  configuration: {
    baseURL: process.env.MODEL_BASE_URL,
  },
  temperature: 0,
});
const res = await model.invoke("介绍下自己");
console.log(res);
