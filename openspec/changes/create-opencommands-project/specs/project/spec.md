## ADDED Requirements

### Requirement: Project Initialization
The system SHALL provide a TypeScript-based CLI tool for universal command management.

#### Scenario: Initialize new project
- **WHEN** creating the opencommands project
- **THEN** it SHALL use TypeScript with proper configuration
- **AND** include necessary build and development tools

### Requirement: Command File Format
The system SHALL support markdown files with YAML frontmatter for command definitions.

#### Scenario: Parse command file
- **WHEN** reading a .md file with frontmatter
- **THEN** the system SHALL extract metadata from YAML frontmatter
- **AND** parse the markdown content as command instructions

### Requirement: Multiple Source Support
The system SHALL support loading commands from Git repositories, local files, and NPM packages.

#### Scenario: Load from Git repository
- **WHEN** installing commands from a Git URL
- **THEN** the system SHALL clone the repository
- **AND** scan for command files

#### Scenario: Load from local directory
- **WHEN** loading commands from a local path
- **THEN** the system SHALL scan the directory for .md files
- **AND** parse each file as a command

### Requirement: Command Registry
The system SHALL maintain a registry of loaded commands with search and filtering capabilities.

#### Scenario: Register command
- **WHEN** a command is successfully parsed
- **THEN** it SHALL be added to the registry with its metadata
- **AND** be searchable by name, namespace, or tags

#### Scenario: Find command by name
- **WHEN** searching for a command by name
- **THEN** the system SHALL return matching commands
- **AND** support both exact and fuzzy matching

### Requirement: CLI Interface
The system SHALL provide a command-line interface with install, list, search, and execute commands.

#### Scenario: Install command from source
- **WHEN** running 'opencommands install <source>'
- **THEN** the system SHALL fetch commands from the source
- **AND** add them to the local registry

#### Scenario: List available commands
- **WHEN** running 'opencommands list'
- **THEN** the system SHALL display all registered commands
- **AND** support filtering by namespace or tags

### Requirement: Claude Code Compatibility
The system SHALL generate output formats compatible with Claude Code slash commands.

#### Scenario: Generate XML registry
- **WHEN** syncing commands for Claude Code compatibility
- **THEN** the system SHALL generate XML format listing available commands
- **AND** follow Claude Code's expected structure

#### Scenario: Generate command help
- **WHEN** listing commands in help format
- **THEN** the system SHALL output in '/command description' format
- **AND** include argument hints when available