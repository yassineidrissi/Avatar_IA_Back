import { exec } from "child_process";
import cors from "cors";
import dotenv from "dotenv";
import voice from "elevenlabs-node";
import express from "express";
import { promises as fs } from "fs";
import OpenAI from "openai";
dotenv.config();

const testMessages = [
  {
    text: "Salut mon cœur ! Comment s’est passée ta journée ?",
    facialExpression: "smile",
    animation: "Talking_0"
  },
  {
    text: "Tu m’as tellement manqué aujourd’hui…",
    facialExpression: "sad",
    animation: "Talking_1"
  },
  {
    text: "Dis-moi tout, je suis impatient·e d’entendre tes nouvelles !",
    facialExpression: "surprised",
    animation: "Laughing"
  }
];

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "-", // Your OpenAI API key here, I used "-" to avoid errors when the key is not set but you should not do that
});

const elevenLabsApiKey = process.env.ELEVEN_LABS_API_KEY; //
const voiceID = "TojRWZatQyy9dujEdiQ1";

const app = express();
app.use(express.json());
app.use(cors());
const port = 3000;

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.get("/voices", async (req, res) => {
  // res.send(await voice.getVoices(elevenLabsApiKey));
  try {
    const voices = await voice.getVoices(elevenLabsApiKey);
    res.json(voices);
  } catch (err) {
    console.error("ElevenLabs error:", err);
    res.status(500).send("TTS fetch failed");
  }
});

app.get("/test-tts", async (req, res) => {
  try {
    const text = "Bonjour ca vas ?";
    const outPath = "audios/eleven_test.mp3";

    // 1) ensure folder
    await fs.mkdir("audios", { recursive: true });

    // 2) call ElevenLabs TTS
    await voice.textToSpeech(elevenLabsApiKey, voiceID, outPath, text);

    // 3) return the file so you can play it in-browser
    const fileData = await fs.readFile(outPath);
    res.set("Content-Type", "audio/mpeg");
    res.send(fileData);
  } catch (err) {
    console.error("TTS error:", err);
    res.status(500).json({ error: err.message });
  }
});


const execCommand = (command) => {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) reject(error);
      resolve(stdout);
    });
  });
};

const lipSyncMessage = async (idx) => {
  const t0 = Date.now();
  console.log(`Starting conversion for message ${idx}`);
  await execCommand(`ffmpeg -y -i audios/message_${idx}.mp3 audios/message_${idx}.wav`);
  console.log(`Conversion done in ${Date.now() - t0}ms`);

  // rhubarb will now resolve its res/ folder correctly
  await execCommand(
    `rhubarb -f json \
      -o audios/message_${idx}.json \
      audios/message_${idx}.wav \
      -r phonetic`
  );
  console.log(`Lip sync done in ${Date.now() - t0}ms`);
};


// const lipSyncMessage = async (message) => {
//   const time = new Date().getTime();
//   console.log(`Starting conversion for message ${message}`);
//   await execCommand(
//     `ffmpeg -y -i audios/message_${message}.mp3 audios/message_${message}.wav`
//     // -y to overwrite the file
//   );
//   console.log(`Conversion done in ${new Date().getTime() - time}ms`);
//   await execCommand('./bin/rhubarb -f json -o audios/message_0.json audios/message_0.wav -r phonetic');

//   // -r phonetic is faster but less accurate
//   console.log(`Lip sync done in ${new Date().getTime() - time}ms`);
// };

app.post("/chat", async (req, res) => {
  const userMessage = req.body.message;
  if (!userMessage) {
    res.send({
      messages: [
        {
          text: "Bonjour, je suis votre assistant·e de la Fondation Léonie Chaptal. S’il vous plaît, écrivez quelque chose si vous avez besoin de plus d’informations.",
          audio: await audioFileToBase64("audios/intro_0.wav"),
          lipsync: await readJsonTranscript("audios/intro_0.json"),
          facialExpression: "smile",
          animation: "Talking_1",
        },
        // {
        //   text: "Nous sommes là pour vous aider ! ",
        //   audio: await audioFileToBase64("audios/intro_1.wav"),
        //   lipsync: await readJsonTranscript("audios/intro_1.json"),
        //   facialExpression: "sad",
        //   animation: "Crying",
        // },    
      ],
    });
    return;
  }
  if (!elevenLabsApiKey || openai.apiKey === "-") {
    res.send({
      messages: [
        {
          text: "Bonjour, je suis votre assistant·e de la Fondation Léonie Chaptal. S’il vous plaît, écrivez quelque chose si vous avez besoin de plus d’informations.",
          audio: await audioFileToBase64("audios/intro_0.wav"),
          lipsync: await readJsonTranscript("audios/intro_0.json"),
          facialExpression: "smile",
          animation: "Talking_1",
        },
        {
          text: "Nous sommes là pour vous aider ! ",
          audio: await audioFileToBase64("audios/intro_1.wav"),
          lipsync: await readJsonTranscript("audios/intro_1.json"),
          facialExpression: "sad",
          animation: "Crying",
        },
      ],
    });
    return;
  }


  const completion = await openai.chat.completions.create({
    model: "gpt-4.1",
    max_tokens: 1000,
    temperature: 0.6,
    response_format: {
      type: "json_object",
    },
    messages: [
      {
        role: "system",
        content: `
        Vous êtes l’assistant virtuel de la Fondation Léonie Chaptal.
        Vous répondrez toujours sous la forme d’un tableau JSON de messages, au maximum 3 messages.
        Chaque message doit comporter les propriétés : text, facialExpression et animation.
        Les expressions faciales disponibles sont : smile, sad, angry, surprised, funnyFace et default.
        Les animations disponibles sont : Talking_0, Talking_1, Talking_2, Crying, Laughing, Rumba, Idle, Terrified et Angry.
        `
      },
      {
        role: "user",
        content: userMessage || "Hello",
      },
    ],
  });
  let messages = JSON.parse(completion.choices[0].message.content);
  if (messages.messages) {
    messages = messages.messages; // ChatGPT is not 100% reliable, sometimes it directly returns an array and sometimes a JSON object with a messages property
  }

  // console.log(messages);
  // return;

  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    // generate audio file
    const fileName = `audios/message_${i}.mp3`; // The name of your audio file
    const textInput = message.text; // The text you wish to convert to speech
    await voice.textToSpeech(elevenLabsApiKey, voiceID, fileName, textInput);
    // generate lipsync
    await lipSyncMessage(i);
    message.audio = await audioFileToBase64(fileName);
    message.lipsync = await readJsonTranscript(`audios/message_${i}.json`);
  }

  res.send({ messages});
});

const readJsonTranscript = async (file) => {
  const data = await fs.readFile(file, "utf8");
  return JSON.parse(data);
};

const audioFileToBase64 = async (file) => {
  const data = await fs.readFile(file);
  return data.toString("base64");
};

app.listen(port, () => {
  console.log(`virtual assistant listening on port ${port}`);
});
