import "dotenv/config";
import {ChatOpenAI} from "@langchain/openai";
import {tool} from "@langchain/core/tools";
import { HumanMessage, SystemMessage, ToolMessage } from "@langchain/core/messages";
import fs from "node:fs/promises";
import {z} from "zod";
// 创建模型实例
const model = new ChatOpenAI({
  model: process.env.MODEL_NAME || "qwen-coder-turbo",
  apiKey: process.env.MODEL_API_KEY,
  temperature: 0,
  configuration: {
    baseURL: process.env.MODEL_BASE_URL,
  },
});

// 创建读取文件工具
const readFileTool = tool(
  async ({filePath}) => {
    const content = await fs.readFile(filePath, "utf8");
    console.log(`[工具读取文件]文件${filePath}-成功读取${content.length}字节`);
    return `文件内容：\n${content}`;
  },
  {
    name: "readFile",
    description: "用此工具来读取文件内容。当用户要求读取文件、查找代码、分析文件内容时，调用此工具。输入文件路径（可以是相对路径或绝对路径）。",
    schema: z.object({
      filePath: z.string().describe("要读取的文件路径"),
    }),
  }
);
// 创建工具列表
const tools = [
  readFileTool,
];
// 创建模型实例，绑定工具
const modelWithTools = model.bindTools(tools);
// 创建消息列表
const messages = [
  new SystemMessage(`你是一个代码助手，可以使用工具读取文件并解释代码。
    工作流程：
    1、用户要求读取文件时，立即调用readFile工具读取文件内容
    2、等待工具返回文件内容
    3、基于文件内容,对文件进行分析和解释

    可用工具：
    - readFile: 读取文件内容（使用此工具获取文件内容）
  `),
  new HumanMessage("请读取文件 ./src/tool-file-reac.mjs 文件内容并详细解释代码"),
];

// 调用模型，获取结果
let result = await modelWithTools.invoke(messages);
// console.log(result);
messages.push(result);
while (result.tool_calls && result.tool_calls.length > 0) {
  console.log(`[工具调用]工具调用结果：${result.tool_calls.length}次`);
  const toolResult = await Promise.all(result.tool_calls.map(async (toolCall) => {
    const tool = tools.find(t => t.name === toolCall.name);
    if (!tool) {
      console.error(`[工具调用]工具${toolCall.name}不存在`);
      return `工具${toolCall.name}不存在`;
    }
    console.log(`[工具调用]工具${toolCall.name}的参数：${toolCall.args}`, toolCall.args);
    try {
      return await tool.invoke(toolCall.args);
    } catch (error) {
      console.error(`[工具调用]工具${toolCall.name}调用失败：${error}`);
      return `工具${toolCall.name}调用失败：${error}`;
    }
  }));
  // 将工具调用结果添加到消息列表，并调用模型，获取结果
  result.tool_calls.forEach((toolCall, index) => {
    messages.push(new ToolMessage({
      content: toolResult[index],
      tool_call_id: toolCall.id,
    }));
  });
  result = await modelWithTools.invoke(messages);
  messages.push(result);
}
console.log(`[工具调用]最终结果：\n${result.content}`);