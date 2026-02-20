# Pinchtab MCP Wrapper vs Default Agent - Comparison

## Overview

This document compares the capabilities of OpenCode with the default agent versus OpenCode with Pinchtab MCP Wrapper.

## Feature Comparison

| Feature | Default Agent | With Pinchtab MCP |
|---------|---------------|-------------------|
| **Web Page Access** | ❌ No | ✅ Yes |
| **Take Screenshots** | ❌ No | ✅ Yes (base64, S3, file) |
| **Click Elements** | ❌ No | ✅ Yes |
| **Fill Forms** | ❌ No | ✅ Yes |
| **Execute JavaScript** | ❌ No | ✅ Yes |
| **Extract Page Text** | ❌ No | ✅ Yes (token-efficient) |
| **List Interactive Elements** | ❌ No | ✅ Yes |
| **Multi-agent Coordination** | ❌ No | ✅ Yes (tab locks) |
| **Browser Automation** | ❌ No | ✅ Full control |
| **Mobile/Desktop Testing** | ❌ No | ✅ Yes |

## Use Case Examples

### 1. Web Research

**Default Agent:**
```
User: "What's the weather in Paris today?"
Agent: "I don't have access to current web data. I can only provide 
general knowledge about Paris climate..."
```

**With Pinchtab MCP:**
```
User: "What's the weather in Paris today?"
Agent: [Uses navigate -> read_page tools]
Result: "Currently in Paris: 18°C, partly cloudy..."
```

### 2. Debugging UI Issues

**Default Agent:**
```
User: "Why is my login button not working?"
Agent: "I can't see your page. Please share the HTML code or describe 
the issue..."
```

**With Pinchtab MCP:**
```
User: "Why is my login button not working?"
Agent: [Uses navigate -> screenshot -> list_interactives tools]
Result: "I can see the button. Let me click it and check for errors..."
[Uses action -> evaluate tools]
Result: "Found the issue: JavaScript error on line 42..."
```

### 3. Form Automation

**Default Agent:**
```
User: "Fill out this form with test data"
Agent: "I cannot interact with web forms directly. You'll need to 
use a browser automation tool..."
```

**With Pinchtab MCP:**
```
User: "Fill out this form with test data"
Agent: [Uses navigate -> list_interactives -> action (fill) tools]
Result: "Form filled successfully with test data. Screenshot attached."
```

### 4. Testing Responsive Design

**Default Agent:**
```
User: "Is my website mobile-friendly?"
Agent: "I cannot view or test your website directly..."
```

**With Pinchtab MCP:**
```
User: "Is my website mobile-friendly?"
Agent: [Uses navigate -> evaluate (set viewport) -> screenshot tools]
Result: "Here's how your site looks on mobile (375px width). 
Issues found: text too small, buttons too close..."
```

## Token Efficiency Comparison

### Reading a Complex Web Page

**Default Approach (without MCP):**
- Cannot access page at all
- User must copy-paste content
- Average: 0 tokens (no access)

**With Pinchtab MCP:**
- `read_page` tool: Extracts clean text only
- `list_interactives`: Shows only interactive elements
- `read_region`: Targets specific sections
- Average: ~2000 tokens vs ~8000 tokens for full HTML

**Token Savings: ~75%**

## Performance Metrics

| Metric | Default | With Pinchtab |
|--------|---------|---------------|
| Page load time | N/A | 2-5 seconds |
| Screenshot capture | N/A | 1-3 seconds |
| Action execution | N/A | <1 second |
| Text extraction | N/A | <1 second |
| Concurrent tabs | N/A | Up to 10+ |

## Capabilities Matrix

### Browser Control

| Action | Default | Pinchtab |
|--------|---------|----------|
| Open URL | ❌ | ✅ |
| Navigate back/forward | ❌ | ✅ |
| Reload page | ❌ | ✅ |
| Manage tabs | ❌ | ✅ |
| Clear cookies | ❌ | ✅ |
| Set user agent | ❌ | ✅ |

### Page Interaction

| Action | Default | Pinchtab |
|--------|---------|----------|
| Click element | ❌ | ✅ |
| Type text | ❌ | ✅ |
| Select dropdown | ❌ | ✅ |
| Scroll | ❌ | ✅ |
| Hover | ❌ | ✅ |
| Drag & drop | ❌ | ✅ |

### Data Extraction

| Source | Default | Pinchtab |
|--------|---------|----------|
| Page text | ❌ | ✅ |
| HTML source | ❌ | ✅ |
| Element attributes | ❌ | ✅ |
| CSS computed styles | ❌ | ✅ |
| JavaScript execution | ❌ | ✅ |

## Security Comparison

| Aspect | Default | Pinchtab |
|--------|---------|----------|
| Local-only operation | N/A | ✅ Yes |
| Token authentication | N/A | ✅ Yes |
| Tab locking | N/A | ✅ Yes |
| Sandboxed browser | N/A | ✅ Yes (Docker) |
| No external data exfiltration | ✅ | ✅ |

## Limitations

### Default Agent
- Cannot access any web resources in real-time
- Cannot verify visual aspects of applications
- Limited to static knowledge
- No browser automation capabilities

### Pinchtab MCP Wrapper
- Requires Docker or external Pinchtab instance
- Adds latency (network calls)
- Screenshot capture time varies
- Some sites may block automation
- JavaScript-heavy apps may need waits

## Recommendation

**Use Default Agent When:**
- Working with local files only
- General programming questions
- Code review and refactoring
- Architecture discussions

**Use Pinchtab MCP When:**
- Testing web applications
- Debugging UI issues
- Web scraping tasks
- Form automation
- Visual regression testing
- Cross-browser testing
- Documentation with screenshots

## Conclusion

The Pinchtab MCP Wrapper extends OpenCode with powerful browser automation capabilities, making it suitable for web development workflows, testing, and debugging tasks that require visual feedback or page interaction. While it adds some overhead and requires additional setup, the ability to see, interact with, and test web pages directly within the agent workflow provides significant value for web development tasks.

**Verdict:** For any web development work, the Pinchtab MCP Wrapper is a significant upgrade over the default agent, providing capabilities that would otherwise require context switching to external tools.
