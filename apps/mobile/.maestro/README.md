# Maestro E2E Tests

End-to-end tests for the PH Performance mobile app using [Maestro](https://maestro.mobile.dev/).

## Prerequisites

Install the Maestro CLI (standalone tool, not an npm package):

```bash
# macOS / Linux
curl -Ls "https://get.maestro.mobile.dev" | bash

# Verify installation
maestro --version
```

You also need a running iOS Simulator or Android Emulator with the app installed.

## Running Tests

```bash
# Run all E2E flows
pnpm test:e2e

# Run a single flow
pnpm test:e2e:login
pnpm test:e2e:navigation
pnpm test:e2e:messaging
pnpm test:e2e:programs

# Or directly via maestro CLI
maestro test .maestro/login.yaml
```

## Test Flows

| Flow              | File              | Description                                      |
|-------------------|-------------------|--------------------------------------------------|
| Login             | `login.yaml`      | Sign in with email/password, verify home loads   |
| Tab Navigation    | `navigation.yaml` | Tap each tab, verify screens render              |
| Messaging         | `messaging.yaml`  | Open conversation, send message, verify delivery |
| Programs          | `programs.yaml`   | Open programs tab, view a program, navigate back |

## Configuration

- `config.yaml` — Global settings: app ID, environment variables for test credentials.
- Update `TEST_EMAIL` and `TEST_PASSWORD` in `config.yaml` to match a valid test account.

## Writing New Flows

Selectors used in this project (in priority order):

1. `testID` — Use `id:` in Maestro YAML (preferred, add `testID` props in components)
2. `accessibilityLabel` — Use `text:` with the label value
3. Visible text — Use `text:` with the on-screen string
4. Placeholder text — Tap on placeholder strings for input fields

Refer to the [Maestro docs](https://maestro.mobile.dev/reference/commands) for the full command reference.

## CI Integration

Add to your CI pipeline:

```yaml
- name: E2E Tests
  run: |
    curl -Ls "https://get.maestro.mobile.dev" | bash
    export PATH="$PATH:$HOME/.maestro/bin"
    maestro test .maestro/
```
