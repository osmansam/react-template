// @vitest-environment jsdom
import {createElement as h} from "react";
import {cleanup,render,screen} from "@testing-library/react";
import {afterEach,expect,it,vi} from "vitest";
import SelectionToggleButton from "./SelectionToggleButton";
import ExpandCollapseIcon from "./ExpandCollapseIcon";
afterEach(cleanup);
it("names selection and expansion controls with native button state",()=>{
 render(h("div",{},h(SelectionToggleButton,{isActive:false,onClick:vi.fn()}),h(ExpandCollapseIcon,{isExpanded:false,onClick:vi.fn()})));
 expect(screen.getByRole("button",{name:"Enable selection"}).getAttribute("aria-pressed")).toBe("false");expect(screen.getByRole("button",{name:"Expand row"}).getAttribute("aria-expanded")).toBe("false");
});
