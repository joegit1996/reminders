# DeepSeek API Setup Guide

## Available DeepSeek Models

DeepSeek offers several models with excellent free tier usage:

### 1. **deepseek-chat** (Recommended)
- **Best for**: General purpose chat, function calling
- **Free Tier**: Very generous (check current limits at https://platform.deepseek.com)
- **API Compatible**: OpenAI-compatible API
- **Function Calling**: ✅ Supported

### 2. **deepseek-coder**
- **Best for**: Code-focused tasks
- **Free Tier**: Very generous
- **Function Calling**: ✅ Supported

### 3. **deepseek-reasoner**
- **Best for**: Complex reasoning tasks
- **Free Tier**: Check current limits
- **Function Calling**: ✅ Supported

## Free Tier Benefits

- **Very generous free tier** - Often better than Gemini/OpenAI
- **OpenAI-compatible API** - Easy to integrate
- **Fast responses** - Optimized for speed
- **Function calling support** - Perfect for agents

## Setup

1. **Get API Key**:
   - Go to https://platform.deepseek.com
   - Sign up/login
   - Get your API key from the dashboard

2. **Add Environment Variable**:
   ```
   DEEPSEEK_API_KEY=your_deepseek_api_key_here
   ```

3. **Update Code**:
   - The code now uses DeepSeek instead of Gemini
   - Uses OpenAI SDK (compatible with DeepSeek)

## Model Selection

The code tries models in this order:
1. `deepseek-chat` (recommended, best balance)
2. `deepseek-coder` (if you prefer code-focused)
3. `deepseek-reasoner` (for complex reasoning)

You can change the model in `/app/api/agent/route.ts` if needed.
