# .agent / AI Agent Configuration

The `.agent/` directory provides specialized configurations, architectural rules, and development skills for AI coding assistants working on the **Daily Tasks** repository.

## Directory Structure

```text
.agent/
├── README.md                           # Overview of the agent workspace setup
├── rules/                              # Technical guidelines and architecture
│   ├── architecture.md                 # System architecture, store flow, and component tree
│   ├── code-style.md                   # Vue 3, TypeScript, Tailwind CSS, and Pinia standards
│   └── project-guidelines.md           # Engineering constraints, storage rules, and build commands
└── skills/                             # Workflow runbooks
    └── daily-tasks-workflow/
        └── SKILL.md                    # Step-by-step guides for adding features and debugging
```

## How It Works

- **Rules (`.agent/rules/*.md`)**: Automatically loaded by the agent to ensure adherence to architectural constraints and code quality.
- **Skills (`.agent/skills/*/SKILL.md`)**: On-demand runbooks for specific feature development and maintenance tasks.
