import { parse as parseYaml } from 'yaml';

export interface FrontMatterResult {
  attributes: Record<string, any>;
  body: string;
}

export function parseFrontMatter(content: string): FrontMatterResult {
  const frontMatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = content.match(frontMatterRegex);

  if (!match) {
    return {
      attributes: {},
      body: content
    };
  }

  const [, frontMatter, body] = match;

  try {
    // Pre-process YAML to handle unquoted values with colons
    const processedFrontMatter = frontMatter
      .split('\n')
      .map(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return line;

        // Check if line contains a colon and value part has colon without quotes
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
          const key = line.substring(0, colonIndex).trim();
          const value = line.substring(colonIndex + 1).trim();

          // If value contains colon and is not already quoted or array/object, wrap in quotes
          if (value.includes(':') && !value.startsWith('"') && !value.startsWith("'") && !value.startsWith('[') && !value.startsWith('{')) {
            return `${key}: "${value}"`;
          }
        }
        return line;
      })
      .join('\n');

    const attributes = parseYaml(processedFrontMatter) || {};
    return {
      attributes,
      body: body.trim()
    };
  } catch (error) {
    throw new Error(`Invalid YAML frontmatter: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export function stringifyFrontMatter(attributes: Record<string, any>, body: string): string {
  const yaml = Object.keys(attributes).length > 0
    ? `---\n${Object.entries(attributes)
        .filter(([_, value]) => value !== undefined && value !== null && value !== '')
        .map(([key, value]) => `${key}: ${formatYamlValue(value)}`)
        .join('\n')}\n---\n`
    : '';

  return yaml + body;
}

function formatYamlValue(value: any): string {
  // Handle undefined and null values
  if (value === undefined || value === null) {
    return '';
  }

  if (typeof value === 'string') {
    // Check if string needs quotes - 包含特殊字符时需要引号
    if (value.includes(':') || value.includes('\n') || value.includes('"') || value.includes('[') || value.includes(']')) {
      return `"${value.replace(/"/g, '\\"')}"`;
    }
    return value;
  }

  if (Array.isArray(value)) {
    return `[${value.map(formatYamlValue).join(', ')}]`;
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}