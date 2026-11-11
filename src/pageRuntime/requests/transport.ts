import axios from "axios";
import { axiosClient } from "../../utils/api/axiosClient";
import type { EffectivePageRequest, PageRequestScope } from "./descriptor";
import { requestURL } from "./descriptor";
import { classifyCollectionError } from "../../visualBuilder/data/collectionFetch";
import { requestRecord } from "../../utils/pageRequests";

export async function fetchPageRequest(scope: PageRequestScope, descriptor: EffectivePageRequest, signal: AbortSignal): Promise<unknown> {
  try {
    const response = await axiosClient.request<unknown>({ method: descriptor.method, url: requestURL(descriptor), data: descriptor.body, headers: descriptor.headers, signal, timeout: 15_000, preserveRecordKeys: true, runtimeScope: scope });
    if (descriptor.envelope === "data") {
      if (!requestRecord(response.data) || !Object.hasOwn(response.data, "data")) throw new Error("The workflow returned an invalid data response.");
      return response.data.data;
    }
    return response.data;
  } catch (reason) { if (axios.isCancel(reason)) throw reason; throw classifyCollectionError(reason); }
}
