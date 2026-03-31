import type { SignalSourceHandler } from "./types";
import type { SignalSource } from "../types";
import { crunchbaseHandler } from "./crunchbase";
import { linkedinJobsHandler } from "./linkedin-jobs";
import { snitcherHandler } from "./snitcher";
import { csvImportHandler } from "./csv-import";

// ── Signal Source Registry ──

const signalHandlers: Partial<Record<SignalSource, SignalSourceHandler>> = {
  crunchbase: crunchbaseHandler,
  linkedin_jobs: linkedinJobsHandler,
  snitcher: snitcherHandler,
  csv_import: csvImportHandler,
  // TODO: Add more signal sources as they are implemented
  // proxycurl: proxycurlHandler,
  // newsapi: newsapiHandler,
  // crm_import: crmImportHandler,
};

/**
 * Get the signal handler for a given source.
 * Returns undefined if no handler is registered for the source.
 */
export function getSignalHandler(
  source: SignalSource
): SignalSourceHandler | undefined {
  return signalHandlers[source];
}

/**
 * List all registered signal source keys.
 */
export function listSignalSources(): SignalSource[] {
  return Object.keys(signalHandlers) as SignalSource[];
}
