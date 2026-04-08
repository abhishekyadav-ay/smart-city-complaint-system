const OpenAI = require('openai');

let openai;

const getOpenAIClient = () => {
  if (!openai) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openai;
};

const VALID_CATEGORIES = ['Pothole', 'Garbage', 'Streetlight', 'Water Issue', 'Others'];

// Keyword-based fallback classifier
const keywordClassify = (description) => {
  const text = description.toLowerCase();
  if (/(pothole|road|crack|bump|ditch|pavement|asphalt)/i.test(text)) return 'Pothole';
  if (/(garbage|trash|waste|litter|dump|refuse|rubbish|sewage smell)/i.test(text)) return 'Garbage';
  if (/(street.?light|lamp|light.?post|dark|lighting|bulb|illuminat)/i.test(text)) return 'Streetlight';
  if (/(water|pipe|leak|flood|drain|sewage|overflow|burst|supply)/i.test(text)) return 'Water Issue';
  return 'Others';
};

const categorizeIssue = async (description) => {
  // If no OpenAI key, use keyword fallback
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'sk-your-openai-api-key-here') {
    console.log('⚠️  OpenAI key not set, using keyword classifier');
    return { category: keywordClassify(description), confidence: 0.7, method: 'keyword' };
  }

  try {
    const client = getOpenAIClient();

    const response = await client.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are a smart city issue classifier. Analyze the complaint description and classify it into exactly one of these categories: Pothole, Garbage, Streetlight, Water Issue, Others.

Rules:
- Pothole: road damage, potholes, cracks in road, uneven pavement
- Garbage: uncollected trash, littering, illegal dumping, garbage smell
- Streetlight: broken/missing street lights, dark streets, faulty lighting
- Water Issue: pipe leaks, flooding, water supply problems, drainage issues
- Others: anything that doesn't fit above categories

Respond with a JSON object: {"category": "CategoryName", "confidence": 0.0-1.0}
Only respond with valid JSON, nothing else.`,
        },
        {
          role: 'user',
          content: description,
        },
      ],
      max_tokens: 60,
      temperature: 0,
    });

    const content = response.choices[0].message.content.trim();
    const parsed = JSON.parse(content);
    const category = VALID_CATEGORIES.includes(parsed.category) ? parsed.category : 'Others';

    return { category, confidence: parsed.confidence || 0.9, method: 'ai' };
  } catch (err) {
    console.error('AI categorization error, using keyword fallback:', err.message);
    return { category: keywordClassify(description), confidence: 0.6, method: 'keyword-fallback' };
  }
};

module.exports = { categorizeIssue };
