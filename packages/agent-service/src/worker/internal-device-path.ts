/**
 * Whether a `read`/`write` path is exactly one mounted tool device
 * (`xd://<tool>` or `xd://<tool>/<topic>`) and nothing else.
 *
 * The worker lets these through to the device, which enforces its own policy
 * and re-authorizes the inner tool call. The read tool also accepts a
 * `;`-separated list mixing URLs with real files, and that list is read inside
 * one outer call, so a prefix test (`startsWith('xd://')`) would exempt a real
 * file that merely follows a device URL (`xd://memory;/etc/passwd`). Only a
 * bare device path may skip the generic file authorization.
 */
const DEVICE_PATH = /^xd:\/\/[^/?#\s;,]+(?:\/[^/?#\s;,]+)?$/;

export const isSingleDevicePath = (value: unknown): boolean => typeof value === 'string' && DEVICE_PATH.test(value);
