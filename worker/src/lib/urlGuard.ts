/**
 * Validates a job-offer URL before the worker fetches it.
 *
 * A Worker has no private network of its own - fetch() egresses over
 * Cloudflare's public network, so classic "reach an internal service"
 * SSRF is structurally hard here already, and there is no DNS API to
 * resolve a hostname and check its IP before fetching. What a bare
 * allowlist-of-schemes check does NOT stop is this worker being used as
 * a free, authenticated, anonymizing HTTP proxy - so this guard leans on
 * what's actually checkable: the URL's own syntax, and IP literals
 * typed directly into it.
 */

import { OfferUnreadableReason } from '../../../src/core/types/api.js';

export type UrlGuardResult = { ok: true; url: URL } | { ok: false; reason: OfferUnreadableReason };

const ALLOWED_PORTS = new Set(['', '80', '443']);
const BLOCKED_HOSTNAMES = new Set(['localhost']);
const BLOCKED_HOSTNAME_SUFFIXES = ['.localhost', '.local', '.internal', '.home.arpa', '.onion'];

/** IPv4 ranges that are never a legitimate public job listing: this
 *  machine, loopback, private/CGNAT, link-local, benchmark, multicast
 *  and reserved space. */
function isBlockedIPv4Octets(octets: number[]): boolean {
  const [a, b] = octets;
  if (a === 0) return true; // 0.0.0.0/8
  if (a === 127) return true; // 127.0.0.0/8 - loopback
  if (a === 10) return true; // 10.0.0.0/8 - private
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 - CGNAT
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 - link-local
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12 - private
  if (a === 192 && b === 168) return true; // 192.168.0.0/16 - private
  if (a === 198 && (b === 18 || b === 19)) return true; // 198.18.0.0/15 - benchmark
  if (a >= 224) return true; // 224.0.0.0/4 multicast, 240.0.0.0/4 reserved
  return false;
}

function isBlockedIPv4Literal(hostname: string): boolean {
  const match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!match) return false;
  const octets = match.slice(1, 5).map(Number);
  if (octets.some((n) => n > 255)) return false; // not actually a valid literal; let fetch() fail on it
  return isBlockedIPv4Octets(octets);
}

/**
 * Catches a bare-digits or 0x-prefixed hostname used to smuggle an IPv4
 * address past a naive dotted-quad check - e.g. "2130706433" and
 * "0x7f000001" both mean 127.0.0.1. Any hostname that is entirely
 * digits/hex in this shape is suspicious enough to block outright: no
 * real job board is hosted at one.
 */
function looksLikeEncodedIp(hostname: string): boolean {
  const isDottedDecimal = /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname);
  if (isDottedDecimal) return false; // handled by isBlockedIPv4Literal instead
  return /^(0x[0-9a-f]+|\d+)(\.(0x[0-9a-f]+|\d+))*$/i.test(hostname);
}

function isBlockedIPv6Literal(hostname: string): boolean {
  // URL.hostname already strips the [] brackets and lowercases hex
  // digits for an IPv6 host, so hostname here is e.g. "::1" or "fe80::1".
  if (hostname === '::1' || hostname === '::') return true; // loopback / unspecified
  if (hostname.startsWith('fe80:')) return true; // link-local
  if (hostname.startsWith('fc') || hostname.startsWith('fd')) return true; // unique local, fc00::/7
  if (hostname.startsWith('::ffff:')) return true; // IPv4-mapped - block regardless of the mapped address
  return false;
}

export function validateOfferUrl(input: string, workerHostname?: string): UrlGuardResult {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return { ok: false, reason: 'bad_scheme' };
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { ok: false, reason: 'bad_scheme' };
  }

  // Credentials in the URL (http://user:pass@host/) are a classic way
  // to smuggle a request past a naive host check further down a chain.
  if (url.username || url.password) {
    return { ok: false, reason: 'blocked_host' };
  }

  if (!ALLOWED_PORTS.has(url.port)) {
    return { ok: false, reason: 'blocked_host' };
  }

  const hostname = url.hostname.toLowerCase();

  if (
    BLOCKED_HOSTNAMES.has(hostname) ||
    BLOCKED_HOSTNAME_SUFFIXES.some((suffix) => hostname.endsWith(suffix))
  ) {
    return { ok: false, reason: 'blocked_host' };
  }

  // Block the worker fetching itself - not a security boundary so much
  // as a guard against a redirect loop burning the subrequest budget.
  if (hostname.endsWith('.workers.dev') || (workerHostname && hostname === workerHostname)) {
    return { ok: false, reason: 'blocked_host' };
  }

  if (isBlockedIPv4Literal(hostname) || looksLikeEncodedIp(hostname)) {
    return { ok: false, reason: 'blocked_host' };
  }

  if (hostname.includes(':') && isBlockedIPv6Literal(hostname)) {
    return { ok: false, reason: 'blocked_host' };
  }

  return { ok: true, url };
}
