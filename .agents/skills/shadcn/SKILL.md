---
name: shadcn
description: Manages shadcn components and projects — adding, searching, fixing, debugging, styling, and composing UI. Provides project context, component docs, and usage examples. Applies when working with shadcn/ui, component registries, presets, --preset codes, or any project with a components.json file. Also triggers for "shadcn init", "create an app with --preset", or "switch to --preset".
user-invokable: true
---

# shadcn/ui Skill

Give your AI assistant deep knowledge of shadcn/ui components, patterns, and best practices.

Skills give AI assistants like Claude Code project-aware context about shadcn/ui. When installed, your AI assistant knows how to find, install, compose, and customize components using the correct APIs and patterns for your project.

## MANDATORY PREPARATION

If a `components.json` file exists in the project or a workspace app, you MUST gather context before proceeding:

1. **Project Context**: On every interaction, the skill runs `shadcn info --json` to get your project's configuration: framework, Tailwind version, aliases, base library (radix or base), icon library, installed components, and resolved file paths.
2. **Component Discovery**: Use `shadcn docs`, `shadcn search`, or MCP tools to find components and their documentation before generating code.

## Core Capabilities

You can ask your AI assistant to:

*   "Add a login form with email and password fields."
*   "Create a settings page with a form for updating profile information."
*   "Build a dashboard with a sidebar, stats cards, and a data table."
*   "Switch to --preset [CODE]"
*   "Can you add a hero from @tailark?"

The skill reads your project's `components.json` and provides the assistant with your framework, aliases, installed components, icon library, and base library so it can generate correct code on the first try.

## What's Included

The skill provides your AI assistant with the following knowledge:

### Project Context
On every interaction, the skill runs `shadcn info --json` to get your project's configuration: framework, Tailwind version, aliases, base library (radix or base), icon library, installed components, and resolved file paths.

### CLI Commands
Full reference for all CLI commands: `init`, `add`, `search`, `view`, `docs`, `diff`, `info`, and `build`. Includes flags, dry-run mode, smart merge workflows, presets, and templates.

### Theming and Customization
How CSS variables, OKLCH colors, dark mode, custom colors, border radius, and component variants work. Includes guidance for both Tailwind v3 and v4.

### Registry Authoring
How to build and publish custom component registries: `registry.json` format, item types, file objects, dependencies, CSS variables, building, hosting, and user configuration.

### MCP Server
Setup and tools for the shadcn MCP server, which lets AI assistants search, browse, and install components from registries.

## How It Works

1.  **Project detection** — The skill activates when it finds a `components.json` file in your project.
2.  **Context injection** — It runs `shadcn info --json` to read your project configuration and injects the result into the assistant's context.
3.  **Pattern enforcement** — The assistant follows shadcn/ui composition rules: using `FieldGroup` for forms, `ToggleGroup` for option sets, semantic colors, and correct base-specific APIs.
4.  **Component discovery** — The assistant uses `shadcn docs`, `shadcn search`, or MCP tools to find components and their documentation before generating code.

## Learn More
*   CLI — Full CLI command reference
*   MCP Server — Connect the MCP server for registry access
*   Theming — CSS variables and customization
*   Registry — Building and publishing custom registries
*   skills.sh — Learn more about AI skills

---

**CRITICAL**: Always ensure that generated code respects the project's aliases and file structure defined in `components.json`.
