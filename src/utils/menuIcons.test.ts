import { FiCheck, FiEdit } from "react-icons/fi";
import { HiOutlineTrash } from "react-icons/hi";
import {
  MdShoppingBag,
  MdSpaceDashboard,
  MdSportsEsports,
  MdStorefront,
} from "react-icons/md";
import { describe, expect, it } from "vitest";
import { getIconByName, getMenuIcon } from "./menuIcons";

describe("menu icon resolution", () => {
  it("resolves action and tab icons used by application defaults", () => {
    expect(getIconByName("FiCheck")).toBe(FiCheck);
    expect(getIconByName("FiEdit")).toBe(FiEdit);
    expect(getIconByName("HiOutlineTrash")).toBe(HiOutlineTrash);
    expect(getIconByName("MdSportsEsports")).toBe(MdSportsEsports);
  });

  it("resolves named menu icons through the dynamic registry", () => {
    expect(getIconByName("MdStorefront")).toBe(MdStorefront);
    expect(getMenuIcon("Online Sales")).toBe(MdStorefront);
    expect(getMenuIcon("Orders")).toBe(MdShoppingBag);
  });

  it("falls back for empty and unsupported icon names", () => {
    expect(getIconByName("")).toBe(MdSpaceDashboard);
    expect(getIconByName("GiIconThatIsNotAllowlisted")).toBe(MdSpaceDashboard);
    expect(getMenuIcon("Unknown Menu")).toBe(MdSpaceDashboard);
  });
});
