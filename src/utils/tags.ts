/**
 * Canonical tag taxonomy for gvns.ca writing collection.
 * Source of truth — referenced by CLI scripts and content validation.
 */

export const VALID_TAGS = [
  // Tech & Homelab
  'homelab',
  'docker',
  'linux',
  'networking',
  'automation',
  'web-dev',
  // Movement & Training
  'bjj',
  'movement',
  'training',
  // Productivity & Life
  'adhd',
  'productivity',
  'pkm',
  // Meta & Essays
  'essay',
  'tutorial',
  'til',
  'meta',
] as const;

export type ValidTag = (typeof VALID_TAGS)[number];

export const TAG_CATEGORIES: Record<string, readonly ValidTag[]> = {
  'Tech & Homelab': ['homelab', 'docker', 'linux', 'networking', 'automation', 'web-dev'],
  'Movement & Training': ['bjj', 'movement', 'training'],
  'Productivity & Life': ['adhd', 'productivity', 'pkm'],
  'Meta & Essays': ['essay', 'tutorial', 'til', 'meta'],
};

/**
 * Keyword-to-tag mapping for content-based tag suggestion.
 * Keys are lowercase words/phrases found in content; values are tags to suggest.
 */
export const TAG_KEYWORDS: Record<string, ValidTag> = {
  // Tech & Homelab
  'self-host': 'homelab',
  selfhost: 'homelab',
  proxmox: 'homelab',
  server: 'homelab',
  nas: 'homelab',
  truenas: 'homelab',
  unraid: 'homelab',
  container: 'docker',
  'docker compose': 'docker',
  dockerfile: 'docker',
  compose: 'docker',
  ubuntu: 'linux',
  debian: 'linux',
  bash: 'linux',
  terminal: 'linux',
  cli: 'linux',
  systemd: 'linux',
  dns: 'networking',
  vpn: 'networking',
  wireguard: 'networking',
  tailscale: 'networking',
  firewall: 'networking',
  vlan: 'networking',
  'ci/cd': 'automation',
  'github actions': 'automation',
  cron: 'automation',
  script: 'automation',
  pipeline: 'automation',
  astro: 'web-dev',
  svelte: 'web-dev',
  tailwind: 'web-dev',
  typescript: 'web-dev',
  frontend: 'web-dev',
  css: 'web-dev',
  react: 'web-dev',
  // Movement & Training
  'jiu-jitsu': 'bjj',
  'jiu jitsu': 'bjj',
  grappling: 'bjj',
  submission: 'bjj',
  guard: 'bjj',
  mobility: 'movement',
  stretching: 'movement',
  flexibility: 'movement',
  'movement practice': 'movement',
  programming: 'training',
  periodisation: 'training',
  strength: 'training',
  conditioning: 'training',
  // Productivity & Life
  'attention deficit': 'adhd',
  neurodivergent: 'adhd',
  'executive function': 'adhd',
  workflow: 'productivity',
  'time management': 'productivity',
  habits: 'productivity',
  systems: 'productivity',
  obsidian: 'pkm',
  'second brain': 'pkm',
  'knowledge management': 'pkm',
  zettelkasten: 'pkm',
  'note-taking': 'pkm',
  // Meta & Essays
  'this site': 'meta',
  'gvns.ca': 'meta',
  'behind the scenes': 'meta',
  changelog: 'meta',
  opinion: 'essay',
  argument: 'essay',
  'step by step': 'tutorial',
  'how to': 'tutorial',
  guide: 'tutorial',
  walkthrough: 'tutorial',
  'today i learned': 'til',
  'quick tip': 'til',
  snippet: 'til',
};
