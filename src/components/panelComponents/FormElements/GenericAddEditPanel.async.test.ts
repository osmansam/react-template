// @vitest-environment jsdom
import { createElement } from "react";
import { render, screen, fireEvent, waitFor, cleanup, act } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import GenericAddEditPanel from "./GenericAddEditPanel";
import { FormKeyTypeEnum, InputTypes } from "../shared/types";
afterEach(cleanup);
it("keeps the modal values while submitting and closes only after the async operation succeeds", async () => {
 let finish!: () => void;
 const operation = new Promise<void>(resolve => { finish = resolve; });
 const close = vi.fn(), submit = vi.fn(() => operation);
 render(createElement(GenericAddEditPanel, { isOpen: true, close, inputs: [{ formKey: "name", type: InputTypes.TEXT, label: "Name", placeholder: "Name", required: false }], formKeys: [{ key: "name", type: FormKeyTypeEnum.STRING }], constantValues: { name: "Before" }, submitItem: submit, buttonName: "Save record" }));
 const field = screen.getByPlaceholderText("Name") as HTMLInputElement;
 fireEvent.change(field, { target: { value: "Edited" } });
 try {
  fireEvent.click(screen.getByRole("button", { name: "Save record" }));
  expect(close).not.toHaveBeenCalled();
  expect(field.value).toBe("Edited");
  fireEvent.click(screen.getByRole("button", { name: "Save record" }));
  expect(submit).toHaveBeenCalledTimes(1);
 } finally { await act(async () => finish()); }
 await waitFor(() => expect(close).toHaveBeenCalledTimes(1));
});
it("preserves entered values and the modal after an asynchronous failure", async () => {
 const log = vi.spyOn(console, "error").mockImplementation(() => {});
 const close = vi.fn();
 try {
  render(createElement(GenericAddEditPanel, { isOpen: true, close, inputs: [{ formKey: "name", type: InputTypes.TEXT, label: "Name", placeholder: "Name", required: false }], formKeys: [{ key: "name", type: FormKeyTypeEnum.STRING }], submitItem: async () => { throw new Error("Request failed"); }, buttonName: "Save record" }));
  const field = screen.getByPlaceholderText("Name") as HTMLInputElement;
  fireEvent.change(field, { target: { value: "Keep my edit" } });
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Save record" })); });
  expect(field.value).toBe("Keep my edit"); expect(close).not.toHaveBeenCalled();
 } finally { log.mockRestore(); }
});
