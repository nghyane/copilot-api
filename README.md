# Copilot API

⚠️ **EDUCATIONAL PURPOSE ONLY** ⚠️
This project is a reverse-engineered implementation of the GitHub Copilot API created for educational purposes only. It is not officially supported by GitHub and should not be used in production environments.

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/E1E519XS7W)

## Project Overview

A wrapper around GitHub Copilot API to make it OpenAI compatible, making it usable for other tools like AI assistants, local interfaces, and development utilities.

## ✨ Latest Features (v1.0.1-beta.2)

- **🔄 Advanced Format Transformation**: Automatically detects and transforms between Anthropic and OpenAI request/response formats
- **📡 Enhanced Streaming Support**: Full streaming compatibility for both OpenAI and Anthropic formats
- **🔍 Smart Format Detection**: Automatically identifies request format based on field presence and structure
- **🤖 Universal Model Support**: Support for all GitHub Copilot models including Claude (Anthropic) models
- **🐳 Multi-Architecture Docker**: Docker images support both AMD64 and ARM64 architectures
- **⚡ Optimized Performance**: Simplified request processing with better compatibility
- **🛠️ Improved Error Handling**: Better error messages and debugging capabilities

## 🔄 Format Transformation

The API now includes a complete transformation system that:

- **Auto-detects** incoming request format (OpenAI vs Anthropic)
- **Transforms** Anthropic requests to OpenAI format for processing
- **Converts** OpenAI responses back to Anthropic format when needed
- **Supports** both streaming and non-streaming responses
- **Maintains** full compatibility with tools that use either format

### Supported Format Differences

| Feature | OpenAI Format | Anthropic Format | Status |
|---------|---------------|------------------|---------|
| System Prompt | `messages[0].role: "system"` | `system: string \| object[]` | ✅ |
| Max Tokens | Optional `max_tokens` | Required `max_tokens` | ✅ |
| Stop Sequences | `stop: string \| string[]` | `stop_sequences: string[]` | ✅ |
| Tools | `tools[].function` | `tools[].input_schema` | ✅ |
| Tool Choice | `tool_choice: "auto" \| object` | `tool_choice: {type: "auto"}` | ✅ |
| Images | `type: "image_url"` | `type: "image", source: {}` | ✅ |
| Response Format | `choices[].message` | `content[].text` | ✅ |
| Streaming | SSE with `data:` prefix | Event-based SSE | ✅ |
| Metadata | `user: string` | `metadata: {user_id}` | ✅ |

### Example Usage

The API automatically handles format conversion:

```bash
# Anthropic format request
curl http://localhost:4141/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-3-5-sonnet-20241022",
    "max_tokens": 1024,
    "system": "You are a helpful assistant",
    "messages": [
      {"role": "user", "content": "Hello!"}
    ]
  }'

# OpenAI format request  
curl http://localhost:4141/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4",
    "messages": [
      {"role": "system", "content": "You are a helpful assistant"},
      {"role": "user", "content": "Hello!"}
    ]
  }'
```

Both requests work seamlessly and return responses in their respective formats.

## Demo

https://github.com/user-attachments/assets/7654b383-669d-4eb9-b23c-06d7aefee8c5

## Prerequisites

- Bun (>= 1.2.x)
- GitHub account with Copilot subscription (Individual or Business)

## Installation

To install dependencies, run:

```sh
bun install
```

## Using with Docker

### Pre-built Images (Recommended)

Pull and run the latest image from Docker Hub:

```sh
# Pull the latest image
docker pull nghyane/copilot-api:latest

# Run with GitHub token
docker run -p 4141:4141 -e GH_TOKEN=your_github_token nghyane/copilot-api:latest
```

### Multi-Architecture Support

The Docker images support both AMD64 and ARM64 architectures:

```sh
# For ARM64 (Apple Silicon, ARM servers)
docker pull nghyane/copilot-api:latest-multiarch

# Run multi-arch image
docker run -p 4141:4141 -e GH_TOKEN=your_github_token nghyane/copilot-api:latest-multiarch
```

### Build from Source

Build your own image:

```sh
docker build -t copilot-api .
```

Run the container:

```sh
docker run -p 4141:4141 -e GH_TOKEN=your_github_token copilot-api
```

## Using with npx

You can run the project directly using npx:

```sh
npx copilot-api@latest start
```

With options:

```sh
npx copilot-api@latest start --port 8080
```

For authentication only:

```sh
npx copilot-api@latest auth
```

## Command Structure

Copilot API now uses a subcommand structure with two main commands:

- `start`: Start the Copilot API server (default command). This command will also handle authentication if needed.
- `auth`: Run GitHub authentication flow without starting the server. This is typically used if you need to generate a token for use with the `--github-token` option, especially in non-interactive environments.

## Command Line Options

### Start Command Options

The following command line options are available for the `start` command:

| Option         | Description                                                                   | Default | Alias |
| -------------- | ----------------------------------------------------------------------------- | ------- | ----- |
| --port         | Port to listen on                                                             | 4141    | -p    |
| --verbose      | Enable verbose logging                                                        | false   | -v    |
| --business     | Use a business plan GitHub account                                            | false   | none  |
| --enterprise   | Use an enterprise plan GitHub account                                         | false   | none  |
| --manual       | Enable manual request approval                                                | false   | none  |
| --rate-limit   | Rate limit in seconds between requests                                        | none    | -r    |
| --wait         | Wait instead of error when rate limit is hit                                  | false   | -w    |
| --github-token | Provide GitHub token directly (must be generated using the `auth` subcommand) | none    | -g    |

### Auth Command Options

| Option    | Description            | Default | Alias |
| --------- | ---------------------- | ------- | ----- |
| --verbose | Enable verbose logging | false   | -v    |

## Example Usage

Using with npx:

```sh
# Basic usage with start command
npx copilot-api@latest start

# Run on custom port with verbose logging
npx copilot-api@latest start --port 8080 --verbose

# Use with a business plan GitHub account
npx copilot-api@latest start --business

# Use with an enterprise plan GitHub account
npx copilot-api@latest start --enterprise

# Enable manual approval for each request
npx copilot-api@latest start --manual

# Set rate limit to 30 seconds between requests
npx copilot-api@latest start --rate-limit 30

# Wait instead of error when rate limit is hit
npx copilot-api@latest start --rate-limit 30 --wait

# Provide GitHub token directly
npx copilot-api@latest start --github-token ghp_YOUR_TOKEN_HERE

# Run only the auth flow
npx copilot-api@latest auth

# Run auth flow with verbose logging
npx copilot-api@latest auth --verbose
```

## Running from Source

The project can be run from source in several ways:

### Development Mode

```sh
bun run dev
```

### Production Mode

```sh
bun run start
```

## 🔧 Model Support

### Supported Models

The API supports all GitHub Copilot models including:

- **OpenAI Models**: GPT-4, GPT-4 Turbo, GPT-3.5 Turbo
- **Anthropic Models**: Claude 3.5 Sonnet, Claude 3 Opus, Claude 3 Haiku
- **Other Models**: As available through GitHub Copilot

### Format Compatibility

- **Automatic Detection**: The API automatically detects whether incoming requests are in OpenAI or Anthropic format
- **Universal Support**: Works with tools that send either format (Cursor, Continue, etc.)
- **No Conversion Needed**: Requests are processed in their original format for maximum compatibility

## 💡 Usage Tips

- Consider using free models (e.g., Gemini, Mistral, Openrouter) as the `weak-model`
- Use architect mode sparingly
- Disable `yes-always` in your aider configuration
- Be mindful that Claude 3.7 thinking mode consumes more tokens
- Enable the `--manual` flag to review and approve each request before processing
- If you have a GitHub business or enterprise plan account with Copilot, use the `--business` or `--enterprise` flag respectively
- For Claude models, the API maintains full compatibility with both OpenAI and Anthropic request formats

### Manual Request Approval

When using the `--manual` flag, the server will prompt you to approve each incoming request:

```
? Accept incoming request? > (y/N)
```

This helps you control usage and monitor requests in real-time.

## 🚀 Technical Improvements

### Enhanced Streaming

- **Better Error Handling**: Improved stream interruption handling and connection management
- **Optimized Performance**: Reduced latency and better resource utilization
- **Connection Resilience**: Automatic cleanup of broken connections

### Format Detection

- **Smart Detection**: Automatically identifies Anthropic vs OpenAI request formats
- **No Conversion Overhead**: Processes requests in their native format
- **Universal Compatibility**: Works with any client that sends either format

### Docker Enhancements

- **Multi-Architecture**: Native support for AMD64 and ARM64
- **Optimized Images**: Smaller image sizes with better caching
- **Production Ready**: Multi-stage builds for optimal performance

## 🔍 Troubleshooting

### Common Issues

1. **Tool Calling Issues with Claude Models**
   - Some Claude models may have limited tool calling support
   - Try using different model variants if tool calls fail

2. **Format Detection Problems**
   - The API automatically detects request formats
   - If you encounter issues, check the request structure matches OpenAI or Anthropic specs

3. **Docker Issues**
   - Use the appropriate architecture image for your platform
   - Ensure GitHub token is properly set via environment variable

### Debug Mode

Enable verbose logging for troubleshooting:

```sh
npx copilot-api@latest start --verbose
```

## 📦 Available Images

| Image | Architecture | Size | Use Case |
|-------|-------------|------|----------|
| `nghyane/copilot-api:latest` | AMD64 | ~215MB | Standard x86_64 systems |
| `nghyane/copilot-api:latest-multiarch` | AMD64 + ARM64 | ~274MB | Universal compatibility |
| `nghyane/copilot-api:v1.0.0` | AMD64 | ~215MB | Specific version |

## 📝 Changelog

### v1.0.1-beta.1 (Latest)
- ✨ Added smart format detection for Anthropic vs OpenAI requests
- 🚀 Enhanced streaming response handling with better error management
- 🤖 Improved support for all GitHub Copilot models including Claude
- 🐳 Added multi-architecture Docker support (AMD64 + ARM64)
- ⚡ Optimized request processing and removed unnecessary format conversion
- 🛠️ Better error handling and debugging capabilities
- 🔧 Simplified codebase with improved maintainability

### v1.0.0
- 🎉 Initial stable release
- 📦 NPM package publication
- 🐳 Docker support
- 🔐 GitHub authentication flow
- 📊 Rate limiting and manual approval features

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

### Development Setup

1. Clone the repository
2. Install dependencies: `bun install`
3. Run in development mode: `bun run dev`
4. Build for production: `bun run build`

## 📄 License

This project is for educational purposes only. Please respect GitHub's terms of service and use responsibly.

## ⭐ Support

If you find this project helpful, please consider:
- ⭐ Starring the repository
- 🐛 Reporting issues
- 💡 Suggesting improvements
- ☕ [Supporting the developer](https://ko-fi.com/E1E519XS7W)
