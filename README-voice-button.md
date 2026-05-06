# Olleh Voice Button Widget
 
A lightweight, embeddable JavaScript widget that enables AI voice conversations on any website. Simply add a `<script>` tag to your HTML and users can start talking to your AI agent with a single click.
 
## Features
 
- **Zero Dependencies for Users** - Single script tag, no build process required
- **Framework Agnostic** - Works with React, Vue, Angular, vanilla HTML, or any web framework
- **LiveKit Powered** - Real-time, low-latency voice communication
- **Customizable** - Configure appearance, placement, and behavior via data attributes
- **Responsive** - Works on desktop and mobile browsers
- **Self-Contained** - All dependencies bundled (including LiveKit client SDK)
 
## Quick Start
 
Add this script tag to your HTML:
 
```html
<div id="voice-button-container"></div>
<script
  src="https://cdn.jsdelivr.net/gh/awaisamir123/chatbot-dashboard/dist/olleh-voice-button.js"
  data-olleh-client-token="YOUR_CLIENT_TOKEN_HERE"
  data-olleh-container-id="voice-button-container"
></script>
```
 
Replace `YOUR_CLIENT_TOKEN_HERE` with your actual Olleh AI client token.
 
## Installation Options
 
### Option 1: Inline Placement (Default)
 
The button renders immediately after the script tag:
 
```html
<script
  src="https://cdn.jsdelivr.net/gh/awaisamir123/chatbot-dashboard/dist/olleh-voice-button.js"
  data-olleh-client-token="YOUR_TOKEN"
></script>
```
 
### Option 2: Container Placement
 
Mount the button inside a specific container:
 
```html
<div id="my-ai-button"></div>
<script
  src="https://cdn.jsdelivr.net/gh/awaisamir123/chatbot-dashboard/dist/olleh-voice-button.js"
  data-olleh-client-token="YOUR_TOKEN"
  data-olleh-container-id="my-ai-button"
></script>
```
 
### Option 3: Fixed Position
 
Display as a floating button in the bottom-right corner:
 
```html
<script
  src="https://cdn.jsdelivr.net/gh/awaisamir123/chatbot-dashboard/dist/olleh-voice-button.js"
  data-olleh-client-token="YOUR_TOKEN"
  data-olleh-position="fixed-bottom-right"
></script>
```
 
## Configuration
 
All configuration is done via `data-*` attributes on the script tag.
 
### Required Attributes
 
| Attribute | Description |
|-----------|-------------|
| `data-olleh-client-token` | Your Olleh AI client token (required) |
 
### API Endpoints (Optional)
 
| Attribute | Default | Description |
|-----------|---------|-------------|
| `data-olleh-session-endpoint` | `https://api.olleh.ai/user/session-token` | Session token API endpoint |
| `data-olleh-register-endpoint` | `https://pyapi.olleh.ai/register_user_session` | User registration endpoint |
| `data-olleh-livekit-url` | `wss://ollehproduction-l1px06vj.livekit.cloud` | LiveKit WebSocket URL |
 
### Placement Options
 
| Attribute | Default | Description |
|-----------|---------|-------------|
| `data-olleh-container-id` | `null` | ID of container element to mount button into |
| `data-olleh-position` | `inline` | `inline` or `fixed-bottom-right` |
 
### Button Text Customization
 
| Attribute | Default | Description |
|-----------|---------|-------------|
| `data-olleh-idle-text` | `Talk to AI` | Text shown when ready to start call |
| `data-olleh-loading-text` | `Connecting...` | Text shown while connecting |
| `data-olleh-active-text` | `End Call` | Text shown during active call |
 
### Styling Options
 
| Attribute | Description |
|-----------|-------------|
| `data-olleh-button-style` | Inline CSS styles (e.g., `background:#16a34a;border-radius:24px;`) |
| `data-olleh-button-class` | Additional CSS class names |
| `data-olleh-width` | Button width (e.g., `200px`) |
| `data-olleh-height` | Button height (e.g., `50px`) |
 
### Behavior Options
 
| Attribute | Default | Description |
|-----------|---------|-------------|
| `data-olleh-agent-timeout` | `45000` | Timeout in milliseconds to wait for agent to join |
 
## Examples
 
### Basic Usage
 
```html
<script
  src="https://cdn.jsdelivr.net/gh/awaisamir123/chatbot-dashboard/dist/olleh-voice-button.js"
  data-olleh-client-token="eyJhbGci..."
></script>
```
 
### Custom Text and Container
 
```html
<div id="ai-assistant"></div>
<script
  src="https://cdn.jsdelivr.net/gh/awaisamir123/chatbot-dashboard/dist/olleh-voice-button.js"
  data-olleh-client-token="eyJhbGci..."
  data-olleh-container-id="ai-assistant"
  data-olleh-idle-text="Speak with Tax Expert"
  data-olleh-loading-text="Connecting to expert..."
  data-olleh-active-text="Hang Up"
></script>
```
 
### Fixed Position with Custom Styling
 
```html
<script
  src="https://cdn.jsdelivr.net/gh/awaisamir123/chatbot-dashboard/dist/olleh-voice-button.js"
  data-olleh-client-token="eyJhbGci..."
  data-olleh-position="fixed-bottom-right"
  data-olleh-button-style="background:#16a34a;border-radius:24px;padding:16px 32px;font-size:18px;"
  data-olleh-idle-text="Call Now"
></script>
```
 
### Multiple Buttons on Same Page
 
You can embed multiple instances with different configurations:
 
```html
<!-- Button 1 -->
<div id="button-1"></div>
<script
  src="https://cdn.jsdelivr.net/gh/awaisamir123/chatbot-dashboard/dist/olleh-voice-button.js"
  data-olleh-client-token="TOKEN_1"
  data-olleh-container-id="button-1"
  data-olleh-idle-text="Sales Assistant"
></script>
 
<!-- Button 2 -->
<div id="button-2"></div>
<script
  src="https://cdn.jsdelivr.net/gh/awaisamir123/chatbot-dashboard/dist/olleh-voice-button.js"
  data-olleh-client-token="TOKEN_2"
  data-olleh-container-id="button-2"
  data-olleh-idle-text="Support Assistant"
></script>
```
 
## How It Works
 
1. **User clicks button** → Widget enters "loading" state
2. **Fetch session token** → Calls your session endpoint with client token
3. **Register session** → Exchanges session token for LiveKit token
4. **Connect to LiveKit** → Establishes WebRTC connection
5. **Enable microphone** → Requests user permission and starts audio
6. **Agent joins** → AI agent connects and conversation begins
7. **Audio streaming** → Real-time bidirectional audio communication
8. **End call** → User clicks button again to disconnect
 
## Browser Compatibility
 
- Chrome/Edge 80+
- Firefox 75+
- Safari 13.1+
- Mobile browsers with WebRTC support
 
**Requirements:**
- Modern browser with `fetch` API
- WebRTC support (RTCPeerConnection)
- Microphone access permission
 
## Security & Privacy
 
- All voice data is transmitted over encrypted WebRTC connections
- Session tokens are generated server-side
- No audio is stored by the widget (storage depends on your backend configuration)
- Microphone access requires explicit user permission
 
## Troubleshooting
 
### Button doesn't appear
- Check that the script URL is correct and accessible
- Verify `data-olleh-client-token` is set
- Check browser console for errors
- If using `data-olleh-container-id`, ensure the container element exists
 
### Connection fails
- Verify your client token is valid
- Check that API endpoints are accessible
- Ensure firewall allows WebRTC traffic (UDP/TCP ports)
- Check browser console for detailed error messages
 
### No audio
- Verify microphone permissions are granted
- Check that your device has a working microphone
- Ensure browser supports WebRTC audio
- Check volume/mute settings
 
### Agent doesn't join
- Increase `data-olleh-agent-timeout` if needed
- Verify your AI agent is properly configured and running
- Check LiveKit server logs for agent connection issues
 
## Development
 
### Building from Source
 
```bash
# Install dependencies
npm install
 
# Build the widget
npm run build:voice-button
 
# Output: dist/olleh-voice-button.js
```
 
### Testing Locally
 
1. Build the widget
2. Open `test-voice-button.html` in a browser
3. Or serve locally:
   ```bash
   npx serve . -l 3333
   # Open http://localhost:3333/test-voice-button.html
   ```
 
### Source Structure
 
```
olleh-widget-script/
├── src/
│   └── olleh-voice-button.js    # Source code
├── dist/
│   └── olleh-voice-button.js    # Built bundle (~486kb)
├── build-voice-button.mjs       # Build script (esbuild)
├── test-voice-button.html       # Test page
└── package.json
```
 
## API Reference
 
### Button States
 
The button has three visual states:
 
1. **Idle** (blue gradient) - Ready to start call
2. **Loading** (gray gradient with spinner) - Connecting to service
3. **Active** (red gradient) - Call in progress
 
### Events
 
The widget doesn't expose a JavaScript API by design (to remain framework-agnostic). All interaction happens through the button UI.
 
## CDN Hosting
 
The widget is hosted on jsDelivr CDN:
 
```
https://cdn.jsdelivr.net/gh/awaisamir123/chatbot-dashboard/dist/olleh-voice-button.js
```
 
**Cache behavior:**
- CDN caches for 7 days
- Use version tags for production: `@v1.0.0/dist/olleh-voice-button.js`
- Purge cache via jsDelivr if needed
 
## License
 
[Your License Here]
 
## Support
 
For issues, questions, or feature requests:
- GitHub Issues: [Your Repo URL]
- Email: [Your Support Email]
- Documentation: https://olleh.ai/docs
 
## Changelog
 
### v0.1.0 (Initial Release)
- Basic voice button functionality
- LiveKit integration
- Customizable text and styling
- Multiple placement options
- Mobile support
 